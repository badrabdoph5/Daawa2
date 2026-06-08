import { mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dirs = [
  path.join(root, "data"),
  path.join(root, "data", "backups"),
  path.join(root, "public", "uploads"),
  ...["client-invitations", "order-requests", "order-previews", "music", "previews", "template-previews"].map((subdir) =>
    path.join(root, "public", "uploads", subdir),
  ),
];

for (const dir of dirs) {
  mkdirSync(dir, { recursive: true });
}

console.log(`[prepare] Runtime directories are ready: ${dirs.length}`);
