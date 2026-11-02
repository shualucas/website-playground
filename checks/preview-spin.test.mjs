import test from "node:test";
import assert from "node:assert/strict";
import { Euler, Quaternion, Vector3 } from "three";
import { PreviewSpin } from "../src/book/preview-spin.ts";

test("preview spin stays camera-relative and finishes without changing the resting orientation", () => {
  const spin = new PreviewSpin(), camera = new Quaternion().setFromEuler(new Euler(.3, -.5, .1));
  const base = new Quaternion().setFromEuler(new Euler(.1, .2, 0));
  spin.start(camera); spin.advance(.55);
  const pose = base.clone(); spin.apply(pose);
  const p = .5, angle = -Math.PI * 2 * Math.pow(1 - p, 4);
  const expected = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0).applyQuaternion(camera), angle)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0).applyQuaternion(camera), .12));
  assert.ok(pose.angleTo(expected) < 1e-7);
  spin.advance(.55); assert.equal(spin.active, false); assert.equal(spin.angle, 0);
  const rest = base.clone(); spin.apply(rest); assert.ok(rest.equals(base));
  spin.start(camera); spin.advance(.2); spin.stop(); spin.apply(rest); assert.ok(rest.equals(base));
});
