// Run with: node test/fixtures/browser-error-probe.mjs
// The deliberate failures exist only in the temporary application copy.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import {
  cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const fixture = mkdtempSync(join(tmpdir(), "paperstreet-browser-proof-"));
const log = join(fixture, "journey-proof.log");
const rootFailure = join(fixture, "root-failure");
const platformFailure = join(fixture, "platform-failure");
const next = join(fixture, "node_modules/next/dist/bin/next");

function injectFailures() {
  const omitted = new Set([".git", ".next", "node_modules", "logs"]);
  cpSync(repo, fixture, {
    recursive: true,
    filter: (path) => !omitted.has(basename(path)) && !basename(path).startsWith(".env"),
  });
  symlinkSync(join(repo, "node_modules"), join(fixture, "node_modules"), "dir");
  const root = join(fixture, "src/app/layout.tsx");
  const source = readFileSync(root, "utf8")
    .replace("export default function RootLayout", 'export const dynamic = "force-dynamic";\n\nexport default function RootLayout')
    .replace("  return (", `  const failure = process.env.PAPERSTREET_ROOT_FAILURE;
  if (failure && existsSync(failure)) {
    unlinkSync(failure);
    throw new Error("fixture-only root failure");
  }
  return (`);
  writeFileSync(root, 'import { existsSync, unlinkSync } from "node:fs";\n' + source);
  writeFileSync(join(fixture, "src/app/(platform)/dashboard/page.tsx"), `import { existsSync, unlinkSync } from "node:fs";
export default function FixtureDashboard() {
  const failure = process.env.PAPERSTREET_PLATFORM_FAILURE;
  if (failure && existsSync(failure)) {
    unlinkSync(failure);
    throw new Error("fixture-only platform failure");
  }
  return <h1>Fixture dashboard recovered</h1>;
}
`);
}

const user = { id: "d2182e64-0ef6-4ad1-b301-92faf5ef821b", aud: "authenticated" };

function sessionCookie() {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const expires_at = Math.floor(Date.now() / 1000) + 3600;
  const access_token = encode({ alg: "HS256", typ: "JWT" }) + "." +
    encode({ sub: user.id, exp: expires_at }) + ".fixture";
  return {
    name: "sb-127-auth-token",
    value: "base64-" + encode({ access_token, refresh_token: "fixture", expires_at, user }),
  };
}

async function verifyRecovery(page, base, path, marker, recovered, expectedEntries) {
  writeFileSync(marker, "");
  const reports = [];
  const record = (response) => {
    if (response.url() === base + "/api/errors" && response.request().method() === "POST") {
      reports.push({ status: response.status(), body: response.request().postData() });
    }
  };
  page.on("response", record);
  const firstReport = page.waitForResponse(
    (response) => response.url() === base + "/api/errors" && response.request().method() === "POST",
  );
  await page.goto(base + path);
  await firstReport;
  await page.getByRole("button", { name: "Try again" }).click();
  await recovered.waitFor();
  page.off("response", record);
  assert.deepEqual(reports, [{ status: 200, body: null }]);
  const rows = readFileSync(log, "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(rows.length, expectedEntries);
  assert.ok(rows.every((row) => row.source === "page" && row.message === "Page render failed"));
  console.log(`${path}: one generic log entry and successful retry`);
}

let app;
let browser;
let mock;
try {
  injectFailures();
  mock = createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify(request.url === "/auth/v1/user" ? user : []));
  }).listen(0, "127.0.0.1");
  await once(mock, "listening");
  const ports = createServer().listen(0, "127.0.0.1");
  await once(ports, "listening");
  const port = ports.address().port;
  await new Promise((resolve) => ports.close(resolve));
  const base = "http://127.0.0.1:" + port;
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:" + mock.address().port,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture-anon-key",
    JOURNEY_ERROR_LOG: log,
    PAPERSTREET_ROOT_FAILURE: rootFailure,
    PAPERSTREET_PLATFORM_FAILURE: platformFailure,
  };
  execFileSync(process.execPath, [next, "build", "--webpack"], { cwd: fixture, env, stdio: "inherit" });
  app = spawn(process.execPath, [next, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: fixture, env, stdio: "inherit",
  });
  const deadline = Date.now() + 30_000;
  for (;;) {
    try {
      if ((await fetch(base + "/login")).ok) break;
    } catch {
      // The server is still starting.
    }
    if (Date.now() > deadline || app.exitCode !== null) throw new Error("Fixture server failed to start.");
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  browser = await chromium.launch();
  const anonymous = await browser.newPage();
  await verifyRecovery(anonymous, base, "/login", rootFailure, anonymous.getByLabel("Email"), 1);

  const signedIn = await browser.newContext();
  await signedIn.addCookies([{ ...sessionCookie(), url: base }]);
  const dashboard = await signedIn.newPage();
  await verifyRecovery(
    dashboard, base, "/dashboard", platformFailure,
    dashboard.getByRole("heading", { name: "Fixture dashboard recovered" }), 2,
  );
} finally {
  await browser?.close();
  if (app && app.exitCode === null && app.signalCode === null) {
    const exited = once(app, "exit");
    app.kill("SIGTERM");
    await exited;
  }
  mock?.closeAllConnections();
  mock?.close();
  rmSync(fixture, { force: true, recursive: true });
}
