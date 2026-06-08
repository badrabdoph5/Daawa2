import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

const args = new Set(process.argv.slice(2));
const type = args.has("--type=daily") ? "daily" : "hourly";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to create a PostgreSQL backup.");
}

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, "-");
const dir = join(process.cwd(), "backups", type);
const file = join(dir, `badrdaawa-${type}-${stamp}.dump`);

mkdirSync(dir, { recursive: true });
mkdirSync(join(process.cwd(), "data", "backups"), { recursive: true });

await new Promise((resolve, reject) => {
  const child = spawn("pg_dump", ["--format=custom", "--compress=9", `--file=${file}`, databaseUrl], {
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    if (code === 0) resolve(undefined);
    else reject(new Error(`pg_dump exited with code ${code}`));
  });
});

console.log(`Backup created: ${file}`);
