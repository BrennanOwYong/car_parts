import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../web/app.js", import.meta.url), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const { fittedFrameSize, imageFileFromClipboard, usableResultOutcome, isRepairRequest } = await import(moduleUrl);

assert.deepEqual(fittedFrameSize(4032, 3024), { width: 1800, height: 1350 });
assert.deepEqual(fittedFrameSize(1200, 800), { width: 1200, height: 800 });
assert.throws(() => fittedFrameSize(0, 800), /Invalid image size/);
const image = { type: "image/png" };
const pasted = imageFileFromClipboard({ items: [{ kind: "file", type: "image/png", getAsFile: () => image }] });
assert.equal(pasted, image);
assert.equal(imageFileFromClipboard({ items: [{ kind: "string", type: "text/plain" }] }), null);
const vehicle = { year: "2020", make: "Mazda", model: "3" };
assert.equal(usableResultOutcome({ outcome: "needs_lidar", vehicle, userMessage: "Scan it.", cadPayload: null, explodedCadPayload: null }), "lidar");
assert.equal(usableResultOutcome({ outcome: "rough_cad_ready", vehicle, cadPayload: "cube(1);", explodedCadPayload: "cube(2);" }), "cad");
assert.equal(usableResultOutcome({ outcome: "needs_lidar", vehicle, userMessage: "Scan it.", cadPayload: "unsafe", explodedCadPayload: null }), "invalid");
assert.equal(usableResultOutcome(null), "invalid");
assert.equal(isRepairRequest("Please repair the crash damage"), true);
assert.equal(isRepairRequest("Make a rough model of this hood"), false);
assert.match(source, /createImageBitmap\(file\)/);
assert.match(source, /canvas\.toBlob\(resolve, "image\/jpeg"/);
assert.match(source, /state\.imageBase64 = await imageAsJpegBase64\(file\)/);
assert.match(source, /document\.addEventListener\("paste"/);
assert.match(source, /await useImage\(file\)/);
const useImageSource = source.slice(source.indexOf("async function useImage"), source.indexOf("function bytesToBase64"));
assert.doesNotMatch(useImageSource, /identifyPhoto|postAstra|fetch\(/);
assert.match(source, /message-input"\)\.addEventListener\("input", updateSendButton\)/);
assert.match(source, /new Set\(\["image\/jpeg", "image\/png", "image\/webp", "image\/heic", "image\/heif"\]\)/);
assert.doesNotMatch(source, /getUserMedia|cameraStream|<video/);

console.log("photo upload checks passed");
