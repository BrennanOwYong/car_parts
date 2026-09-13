import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../web/app.js", import.meta.url), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const { normalizeObjToMillimeters, detectDepthCapability } = await import(moduleUrl);

const mesh = [
  "# ARKit mesh in metres",
  "v -0.01 0 0.005",
  "v 0.02 0.04 -0.005",
  "v 0 0.02 0",
  "f 1 2 3",
].join("\n");

const normalized = normalizeObjToMillimeters(mesh, "m", 1);
assert.deepEqual(normalized.size, [30, 40, 10]);
assert.equal(normalized.vertices, 3);
assert.match(normalized.text, /units are millimetres/);
assert.match(normalized.text, /v -10 0 5/);

const calibrated = normalizeObjToMillimeters(mesh, "m", 1.02);
assert.deepEqual(calibrated.size.map((value) => Number(value.toFixed(6))), [30.6, 40.8, 10.2]);
assert.throws(() => normalizeObjToMillimeters("f 1 2 3", "m", 1), /does not contain vertices/);
assert.throws(() => normalizeObjToMillimeters(mesh, "unknown", 1), /Invalid mesh scale/);

const iphone = await detectDepthCapability({ userAgent: "Mozilla/5.0 (iPhone)", xr: null }, {});
assert.deepEqual(iphone, { isIPhone: true, immersiveAR: false, directMeshAccess: false });

console.log("mesh calculation checks passed");
