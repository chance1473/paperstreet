import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const file = process.env.JOURNEY_ERROR_LOG || path.join(process.cwd(), "logs", "journey-errors.log");
const count = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 20;

if (!existsSync(file)) {
  console.log(`No errors recorded yet (${file}).`);
  process.exit(0);
}

const lines = readFileSync(file, "utf8").split("\n").filter(Boolean).slice(-count);
for (const line of lines) {
  try {
    const entry = JSON.parse(line);
    console.log(`${entry.at}  ${String(entry.source).padEnd(11)} ${entry.message}`);
  } catch {
    console.log(line);
  }
}
console.log(`\n${lines.length} most recent entr${lines.length === 1 ? "y" : "ies"} from ${file}`);
