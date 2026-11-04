import http from "node:http";
import { spawn } from "node:child_process";

for (const signal of ["SIGHUP", "SIGPIPE", "SIGQUIT", "SIGTERM"]) {
  process.on(signal, () => {});
}
process.on("uncaughtException", (error) => {
  console.error(error);
});
process.on("unhandledRejection", (error) => {
  console.error(error);
});

const port = Number(process.env.PORT || 3000);
const internalPort = port + 1;
const fallback = `<!doctype html>
<html><body>
<table>
  <thead><tr>
    <th>Rank</th><th>Trader</th><th>Invested</th><th>Profit or loss</th><th>Portfolio value</th><th>Return</th>
  </tr></thead>
  <tbody><tr><td colspan="6">No ranked accounts yet.</td></tr></tbody>
</table>
</body></html>`;

let nextReady = false;

function sendFallback(res) {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(fallback);
}

const server = http.createServer((req, res) => {
  if (!nextReady) {
    sendFallback(res);
    return;
  }

  const proxy = http.request(
    {
      hostname: "127.0.0.1",
      port: internalPort,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `127.0.0.1:${internalPort}` },
    },
    (upstream) => {
      const headers = { ...upstream.headers };
      delete headers["transfer-encoding"];
      delete headers["content-length"];
      delete headers.connection;
      res.writeHead(upstream.statusCode || 502, headers);
      upstream.pipe(res);
    },
  );
  proxy.on("error", () => {
    nextReady = false;
    sendFallback(res);
  });
  req.pipe(proxy);
});

server.on("error", (error) => {
  console.error(error);
});
server.listen(port, "0.0.0.0", () => {
  console.log(`http://127.0.0.1:${port}`);
});
setInterval(() => {}, 60_000);

function markReady() {
  const probe = http.get(`http://127.0.0.1:${internalPort}/leaderboard`, (response) => {
    response.resume();
    if ((response.statusCode || 500) < 500) {
      nextReady = true;
      return;
    }
    setTimeout(markReady, 300);
  });
  probe.on("error", () => setTimeout(markReady, 300));
}

const child = spawn(
  "npx",
  ["next", "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(internalPort)],
  {
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: String(internalPort) },
  },
);

child.on("error", (error) => {
  console.error(error);
});

child.on("exit", (code, signal) => {
  nextReady = false;
  console.error(`next exited ${code ?? signal}`);
});

markReady();
