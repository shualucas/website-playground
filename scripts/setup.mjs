import { createHash } from "node:crypto";
import { readFile, writeFile, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function dependencyKey(manifest, lock, runtime = `${process.versions.node.split(".")[0]}:${process.platform}:${process.arch}`) {
  const { dependencies, devDependencies, optionalDependencies, overrides, engines } = manifest;
  return createHash("sha256").update(JSON.stringify({ dependencies, devDependencies, optionalDependencies, overrides, engines, runtime })).update(lock).digest("hex");
}

export function installedLockMatches(lock, installed) {
  if (!installed.packages || !lock.packages) return false;
  const same = (a, b) => a && b && ["version", "resolved", "integrity", "link"].every(key => a[key] === b[key]);
  return Object.entries(installed.packages).every(([path, pkg]) => same(pkg, lock.packages[path]))
    && Object.entries(lock.packages).every(([path, pkg]) => !path || pkg.optional || same(pkg, installed.packages[path]));
}

export async function setup(cwd = process.cwd()) {
  const manifest = JSON.parse(await readFile(resolve(cwd, "package.json"), "utf8"));
  const lockText = await readFile(resolve(cwd, "package-lock.json"), "utf8");
  const key = dependencyKey(manifest, lockText), marker = resolve(cwd, "node_modules/.codex-deps-key");
  let valid = false;
  try {
    const installed = JSON.parse(await readFile(resolve(cwd, "node_modules/.package-lock.json"), "utf8"));
    valid = installedLockMatches(JSON.parse(lockText), installed);
    if (valid) {
      await Promise.all(Object.keys(installed.packages).map(path => access(resolve(cwd, path, "package.json"))));
      let saved = "";
      try { saved = (await readFile(marker, "utf8")).trim(); } catch {}
      valid = saved === key || (!saved && spawnSync("npm", ["ls", "--depth=0"], { cwd, stdio:"ignore" }).status === 0);
    }
  } catch { valid = false; }
  if (!valid) {
    const result = spawnSync("npm", ["ci", "--cache", "/tmp/npm-cache", "--no-audit", "--no-fund"], { cwd, stdio:"inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`npm ci failed (${result.status}).`);
  }
  await writeFile(marker, `${key}\n`);
  console.log(valid ? "Dependencies match the lockfile; reusing node_modules." : "Installed dependencies from the lockfile.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await setup();
