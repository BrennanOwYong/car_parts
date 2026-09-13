// Live deployment checks; no mocked network responses and no paid Astra requests.
// Official references checked 2026-09-13:
// https://playwright.dev/docs/api/class-browser#browser-new-context
// https://playwright.dev/docs/api/class-apirequestcontext#api-request-context-post
// https://playwright.dev/docs/downloads
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import {unzipSync} from 'fflate';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.FORMA_PLAYWRIGHT_MODULE || 'playwright');
const base = (process.argv[2] || 'http://127.0.0.1:8793').replace(/\/$/, '');
const output = path.resolve(process.env.FORMA_TEST_OUTPUT || path.join(os.tmpdir(), 'forma-deployment-smoke'));
await mkdir(output, {recursive: true});
const checks = [], errors = [], assetResponses = [];
const browser = await chromium.launch({headless: true, args: ['--enable-unsafe-swiftshader']});
const context = await browser.newContext({viewport: {width: 1440, height: 1000}, acceptDownloads: true, reducedMotion: 'reduce'});
const page = await context.newPage();
page.setDefaultTimeout(45000);
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {
  if (!/\.(glb|wasm|png)(\?|$)/.test(response.url())) return;
  const asset = {url: response.url(), status: response.status(), responseAt: new Date().toISOString()};
  assetResponses.push(asset);
  response.finished().then(error => {asset.finished = !error; asset.timing = response.request().timing();});
});
const check = (name, details = {}) => {checks.push({name, ...details}); console.log(`PASS ${name}`);};

function inspectSTL(bytes) {
  assert.ok(bytes.length >= 84, 'Binary stereolithography (STL) header exists');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), triangles = view.getUint32(80, true);
  assert.ok(triangles > 10); assert.equal(bytes.length, 84 + triangles * 50);
  const edges = new Map(), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let volume = 0;
  for (let i = 0; i < triangles; i++) {
    const vertices = Array.from({length: 3}, (_, v) => Array.from({length: 3}, (_, a) => {
      const value = view.getFloat32(84 + i * 50 + 12 + v * 12 + a * 4, true);
      assert.ok(Number.isFinite(value)); min[a] = Math.min(min[a], value); max[a] = Math.max(max[a], value); return value;
    }));
    const keys = vertices.map(v => v.map(x => Math.round(x * 100)).join(','));
    assert.equal(new Set(keys).size, 3, 'Triangles must not collapse');
    for (let e = 0; e < 3; e++) {const key = [keys[e], keys[(e + 1) % 3]].sort().join('|'); edges.set(key, (edges.get(key) || 0) + 1);}
    const [a,b,c] = vertices;
    volume += (a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
  }
  assert.ok([...edges.values()].every(count => count === 2), 'Every joined edge must have two faces');
  assert.ok(volume > 0); assert.ok(min[2] >= -.01);
  assert.ok(Math.max(...max.map((v,i) => v-min[i])) > 500, 'Geometry is millimetre scale');
  return {triangles, volumeMm3: Math.round(volume)};
}

try {
  if (process.env.FORMA_REPAIR_ONLY !== '1') {
  const response = await page.goto(base, {waitUntil: 'domcontentloaded'});
  assert.equal(response.status(), 200); assert.equal(new URL(page.url()).origin, new URL(base).origin);
  assert.match(await page.title(), /FORMA/);
  await page.waitForFunction(() => document.getElementById('landing-load')?.hidden === true);
  assert.ok(await page.locator('#landing-canvas canvas').isVisible());
  check('Unauthenticated landing page loads the real 3D model');
  await page.screenshot({path: path.join(output, 'landing.png')});

  await page.locator('#landing-scroll-cue').click();
  await page.waitForFunction(() => document.getElementById('modes')?.getAttribute('aria-hidden') === 'false');
  assert.ok(await page.locator('#fix-mode').isEnabled());
  await page.locator('#design-mode').click();
  await page.locator('#setup').waitFor({state: 'visible'});
  await page.locator('#vehicle-form button[type=submit]').click();
  await page.waitForFunction(() => document.getElementById('loader')?.hidden === true);
  assert.ok(await page.locator('#viewport canvas').isVisible());
  assert.ok(await page.locator('#export-button').isDisabled());
  await page.locator('[data-style="sport"]').click();
  await page.locator('#region-tabs [data-region="sides"]').click();
  await page.locator('[data-style="subtle"]').click();
  assert.equal(await page.locator('#selected-count').textContent(), '2 modifications');
  await page.locator('#compare').click(); assert.equal(await page.locator('#compare').getAttribute('aria-pressed'), 'true');
  await page.locator('#compare').click();
  await page.screenshot({path: path.join(output, 'design-studio.png')});
  check('Design studio loads Ferrari model and updates front/side configuration');

  const exportResponsePromise = page.waitForResponse(r => r.url() === base + '/api/exports' && r.request().method() === 'POST');
  await page.locator('#export-button').click();
  const exportResponse = await exportResponsePromise; assert.equal(exportResponse.status(), 201);
  const exported = await exportResponse.json();
  await page.locator('#result').waitFor({state: 'visible'});
  assert.equal(await page.locator('#parts-layout .part-card').count(), 3);
  const downloadPromise = page.waitForEvent('download'); await page.locator('#download-kit').click();
  const download = await downloadPromise; const archivePath = path.join(output, 'kit.zip'); await download.saveAs(archivePath);
  const files = unzipSync(new Uint8Array(await readFile(archivePath)));
  assert.equal(Object.keys(files).filter(name => name.endsWith('.stl')).length, 3);
  const manifest = JSON.parse(new TextDecoder().decode(files['manifest.json']));
  assert.equal(manifest.units, 'mm'); assert.equal(manifest.upAxis, 'Z'); assert.equal(manifest.fitVerified, false);
  for (const part of exported.parts) {
    const archiveGeometry = inspectSTL(files[part.name]);
    const partResponse = await context.request.get(base + part.url); assert.equal(partResponse.status(), 200);
    const directBytes = await partResponse.body(); assert.deepEqual(directBytes, Buffer.from(files[part.name]));
    check(`Downloaded valid ${part.name}`, archiveGeometry);
  }
  await page.screenshot({path: path.join(output, 'download-results.png')});
  check('Browser archive download contains all selected parts and matching individual files');

  const invalid = [
    ['/api/exports', 'invalid-json', 400],
    ['/api/exports', {vehicleId: 'unknown', selections: {front: 'sport'}}, 400],
    ['/api/exports', {vehicleId: manifest.vehicleId, selections: {front: 'stock'}}, 400],
    ['/api/exports', 'x'.repeat(9000), 413],
    ['/api/repair/chat', {phase: 'unsupported'}, 400],
  ];
  for (const [route, data, expected] of invalid) {
    const res = await context.request.post(base + route, {data, headers: {'Content-Type': 'application/json', 'Origin': base}});
    assert.equal(res.status(), expected, route + ' must reject invalid input');
    assert.doesNotMatch(await res.text(), /Traceback|Bearer|sk-[A-Za-z0-9]{10}/);
  }
  assert.equal((await context.request.get(base + '/api/exports/missing/kit.zip')).status(), 404);
  check('Invalid configuration, malformed/oversized requests and unknown downloads are rejected');
  }

  const catalogResponse = await context.request.get(base + '/api/repair/catalog'); assert.equal(catalogResponse.status(), 200);
  const catalog = await catalogResponse.json(); const ready = catalog.vehicles.filter(v => v.prepared);
  assert.ok(ready.length > 0); assert.equal(Object.keys(catalog.families).length, 5);
  await page.goto(base + '/fix.html', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.querySelectorAll('#vehicle-list canvas').length === 1 && document.getElementById('showroom-name').textContent.length > 0, null, {timeout: 120000});
  assert.equal(await page.locator('#car-picker img,#car-picker article,.showroom-car,.vehicle-card').count(), 0);
  const selected = ready.find(v => /corolla/i.test(v.id)) || ready[0];
  await page.locator('#vehicle-list').focus();
  for (let index = 0; index < ready.indexOf(selected); index++) await page.keyboard.press('ArrowRight');
  await page.waitForFunction(label => document.getElementById('vehicle-list').getAttribute('aria-label') === label, `Select ${selected.make} ${selected.model}`);
  const repairLoadStarted = Date.now();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.getElementById('viewer-controls')?.hidden === false, null, {timeout: 120000});
  const repairLoadMs = Date.now() - repairLoadStarted;
  assert.ok(await page.locator('#viewport canvas').isVisible());
  assert.ok(await page.locator('#confirm-repair').isDisabled());
  await page.locator('#explode').fill('100'); assert.equal(await page.locator('#assembly-state').textContent(), 'Exploded');
  await page.locator('#viewer-controls summary').click();
  const partRows = page.locator('.part-row'); assert.ok(await partRows.count() > 0);
  await partRows.first().click(); assert.ok(await page.locator('#part-inspect').isVisible());
  await page.locator('#isolate').click(); assert.equal(await page.locator('#isolate').textContent(), 'Show complete car');
  await page.locator('#isolate').click();
  const status = await context.request.get(base + '/api/repair/status');
  assert.ok([200, 503].includes(status.status()));
  const statusData = await status.json(); assert.equal(typeof statusData.configured, 'boolean');
  if (process.env.FORMA_EXPECT_UNCONFIGURED === '1') assert.equal(statusData.configured, false, 'This deployment should not expose paid model access');
  assert.doesNotMatch(JSON.stringify(statusData), /Bearer|sk-[A-Za-z0-9]{10}/);
  check('Repair showroom/catalog load and real prepared vehicle supports explode and part isolation', {preparedCars: ready.length, selectedVehicle: selected.id, repairLoadMs, status: statusData});
  if (!statusData.configured) {
    const photo = await readFile(new URL('../public/assets/ferrari_ao.png', import.meta.url));
    await page.locator('#damage-photos').setInputFiles({name: 'test-part.png', mimeType: 'image/png', buffer: photo});
    await page.locator('#message-input').fill('Test review availability.');
    const unavailableResponse = page.waitForResponse(r => r.url() === base + '/api/repair/chat' && r.request().method() === 'POST');
    await page.locator('#send-message').click(); const unavailable = await unavailableResponse;
    assert.equal(unavailable.status(), 503, 'Unconfigured repair reply: ' + await unavailable.text());
    await page.locator('#chat-error').waitFor({state: 'visible'});
    assert.match(await page.locator('#chat-error').textContent(), /not configured/);
    assert.equal(await page.locator('#photos .photo').count(), 1);
    assert.equal(await page.locator('#message-input').inputValue(), 'Test review availability.');
    assert.ok(await page.locator('#send-message').isEnabled());
    check('Unconfigured live review reports a useful error and preserves the uploaded photo and message');
  }
  await page.screenshot({path: path.join(output, 'repair-workspace.png')});

  assert.equal(errors.length, 0, `Browser exceptions: ${errors.join('; ')}`);
  assert.ok(assetResponses.some(r => r.url.includes('corolla') && r.status === 200));
  assert.ok(assetResponses.every(r => r.status < 400), 'All requested model and texture assets succeeded');
  check('No browser exceptions or failed model/texture responses');
} catch (error) {
  await page.screenshot({path: path.join(output, 'failure.png')}).catch(() => {});
  throw error;
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify({base, checkedAt: new Date().toISOString(), checks, errors, assetResponses}, null, 2));
  await browser.close();
  console.log(`Report: ${path.join(output, 'report.json')}`);
}
