import test from "node:test";
import assert from "node:assert/strict";
import { dependencyKey, installedLockMatches } from "../scripts/setup.mjs";

test("dependency reuse survives script edits but invalidates for dependency, lock or runtime changes", () => {
  const manifest = { dependencies:{ vite:"1" }, scripts:{ dev:"vite" } }, key = dependencyKey(manifest, "lock", "24:linux:x64");
  assert.equal(dependencyKey({ ...manifest, scripts:{ dev:"vite --host" } }, "lock", "24:linux:x64"), key);
  assert.notEqual(dependencyKey({ dependencies:{ vite:"2" } }, "lock", "24:linux:x64"), key);
  assert.notEqual(dependencyKey(manifest, "new lock", "24:linux:x64"), key);
  assert.notEqual(dependencyKey(manifest, "lock", "25:linux:x64"), key);
});

test("an existing install must match required locked packages and cannot silently adopt a different version", () => {
  const pkg = { version:"1", integrity:"sha512-test" }, lock = { packages:{ "":{}, "node_modules/vite":pkg, "node_modules/other-platform":{ ...pkg, optional:true } } };
  assert.equal(installedLockMatches(lock, { packages:{ "node_modules/vite":pkg } }), true);
  assert.equal(installedLockMatches(lock, { packages:{} }), false);
  assert.equal(installedLockMatches(lock, { packages:{ "node_modules/vite":{ ...pkg, version:"2" } } }), false);
});
