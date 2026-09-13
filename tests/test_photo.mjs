import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../web/app.js", import.meta.url), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const { fittedFrameSize } = await import(moduleUrl);

assert.deepEqual(fittedFrameSize(4032, 3024), { width: 1800, height: 1350 });
assert.deepEqual(fittedFrameSize(1200, 800), { width: 1200, height: 800 });
assert.throws(() => fittedFrameSize(0, 800), /Invalid image size/);
assert.match(source, /createImageBitmap\(file\)/);
assert.match(source, /canvas\.toBlob\(resolve, "image\/jpeg"/);
assert.match(source, /state\.imageBase64 = await imageAsJpegBase64\(file\)/);
assert.doesNotMatch(source, /getUserMedia|cameraStream|<video/);

console.log("photo upload checks passed");
