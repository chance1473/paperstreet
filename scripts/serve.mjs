import { spawn } from "node:child_process";

const port = process.env.PORT || "3000";
const hostname = "0.0.0.0";

const child = spawn(
  "npx",
  ["next", "dev", "--webpack", "--hostname", hostname, "--port", port],
  {
    stdio: "inherit",
    env: { ...process.env, HOSTNAME: hostname },
  },
);

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
