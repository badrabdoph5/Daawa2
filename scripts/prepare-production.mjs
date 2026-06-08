import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const prismaBin = path.join(root, "node_modules", ".bin", "prisma");
const dirs = [
  path.join(root, "data"),
  path.join(root, "data", "backups"),
  path.join(root, "public", "uploads"),
  ...["client-invitations", "order-requests", "order-previews", "music", "previews", "template-previews"].map((subdir) =>
    path.join(root, "public", "uploads", subdir),
  ),
];

function cleanEnvValue(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^database_url=/i, "")
    .replace(/^DATABASE_URL=/, "")
    .trim();
}

function getDatabaseUrl() {
  const direct = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_PRIVATE_URL,
    process.env.DATABASE_PUBLIC_URL,
  ]
    .map(cleanEnvValue)
    .find((value) => /^postgres(?:ql)?:\/\//i.test(value));

  if (direct) return direct;

  const host = cleanEnvValue(process.env.PGHOST);
  const port = cleanEnvValue(process.env.PGPORT) || "5432";
  const user = cleanEnvValue(process.env.PGUSER);
  const password = cleanEnvValue(process.env.PGPASSWORD);
  const database = cleanEnvValue(process.env.PGDATABASE);
  if (!host || !user || !password || !database) return "";

  const url = new URL(`postgresql://${host}:${port}/${database}`);
  url.username = user;
  url.password = password;
  url.searchParams.set("schema", "public");
  return url.toString();
}

function runPrisma(args, options = {}) {
  const result = spawnSync(prismaBin, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...options.env },
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

for (const dir of dirs) {
  mkdirSync(dir, { recursive: true });
}
console.log(`[prepare] Runtime directories are ready: ${dirs.length}`);

runPrisma(["generate"]);

const databaseUrl = getDatabaseUrl();
if (!databaseUrl) {
  console.warn("[prepare] No DATABASE_URL/Postgres variables found. Skipping prisma migrate deploy.");
  process.exit(0);
}

console.log("[prepare] Running prisma migrate deploy.");
runPrisma(["migrate", "deploy"], { env: { DATABASE_URL: databaseUrl } });
