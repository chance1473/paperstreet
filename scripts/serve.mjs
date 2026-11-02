import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const port = process.env.PORT || "3000";
const hostname = process.env.HOSTNAME || "0.0.0.0";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited ${code ?? signal}`));
    });
  });
}

if (!existsSync(".next/BUILD_ID")) {
  await run("npx", ["next", "build"]);
}

await run("npx", ["next", "start", "--hostname", hostname, "--port", port]);
