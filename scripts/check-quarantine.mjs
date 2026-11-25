import { readFileSync } from "node:fs";

const entries = JSON.parse(readFileSync("test/quarantine.json", "utf8"));
if (!Array.isArray(entries)) {
  console.error("test/quarantine.json must be a list");
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
for (const entry of entries) {
  if (!entry || typeof entry.file !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.expires)) {
    console.error("each quarantine entry needs a file and an expires date");
    process.exit(1);
  }
  if (entry.expires < today) {
    console.error(`${entry.file} quarantine expired on ${entry.expires}`);
    process.exit(1);
  }
}
