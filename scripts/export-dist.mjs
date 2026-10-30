import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "apps", "web", "dist");
const target = resolve(root, "dist");

if (!existsSync(source)) {
  console.error("Web build output not found at apps/web/dist");
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log("Mirrored apps/web/dist to dist/ for zero-config static hosts.");
