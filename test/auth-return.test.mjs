import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const callback = readFileSync(new URL("../src/app/auth/callback/route.ts", import.meta.url), "utf8");
const login = readFileSync(new URL("../src/components/auth/auth-forms.tsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("../src/components/layout/app-shell.tsx", import.meta.url), "utf8");

test("the confirmation callback exchanges the code and stays on this app", () => {
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /\/login\?error=auth/);
  assert.match(callback, /!next\.startsWith\("\/\/"\)/);
  assert.match(callback, /!next\.includes\(":\/\/"\)/);
  assert.match(callback, /return "\/dashboard"/);
});

test("sign-in opens the dashboard and the shell can sign out", () => {
  assert.match(login, /signInWithPassword/);
  assert.match(login, /nextPath\.startsWith\("\/"\) \? nextPath : "\/dashboard"/);
  assert.match(shell, /action=\{signOut\}/);
  assert.match(shell, /Log out/);
});
