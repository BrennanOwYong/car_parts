// Prepublish checks against a real local static server. No response mocks or paid calls.
// Official Playwright references checked 2026-09-13:
// https://playwright.dev/docs/api/class-browser#browser-new-context
// https://playwright.dev/docs/api/class-apirequestcontext#api-request-context-get
// https://playwright.dev/docs/downloads
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(new URL('../../design_mod/package.json', import.meta.url));
const {unzipSync} = require('fflate');
const {chromium} = require(process.env.FORMA_PLAYWRIGHT_MODULE || 'playwright');
const base = (process.argv[2] || '').replace(/\/$/, '');
assert.ok(base, 'Supply the built local static server address.');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'This runner only permits prepublish local verification.');
const output = path.resolve(process.env.FORMA_TEST_OUTPUT || path.join(os.tmpdir(), 'forma-sites-transfer'));
await mkdir(output, {recursive: true});
const checks = [], errors = [], requests = [], assets = [];
let browser, page, failure;
function check(name, details = {}) {checks.push({name, ...details}); console.log(`PASS ${name}`);}
async function bytesAt(relative) {
  const url = new URL(relative, base);
  assert.equal(url.origin, new URL(base).origin, 'Generated files must stay on this static site');
  const response = await fetch(url); assert.equal(response.status, 200, `Missing static file: ${relative}`);
  return new Uint8Array(await response.arrayBuffer());
}
const decodeJSON = bytes => JSON.parse(new TextDecoder().decode(bytes));
const jsonAt = async relative => decodeJSON(await bytesAt(relative));

function inspectSTL(bytes) {
  assert.ok(bytes.length >= 84, 'Binary stereolithography (STL) header exists');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), triangles = view.getUint32(80, true);
  assert.ok(triangles > 10); assert.equal(bytes.length, 84 + triangles * 50);
  const edges = new Map(), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let volume = 0;
  for (let i = 0; i < triangles; i++) {
    const vertices = Array.from({length: 3}, (_, v) => Array.from({length: 3}, (_, axis) => {
      const value = view.getFloat32(84 + i * 50 + 12 + v * 12 + axis * 4, true);
      assert.ok(Number.isFinite(value)); min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value); return value;
    }));
    const keys = vertices.map(v => v.map(x => Math.round(x * 100)).join(','));
    assert.equal(new Set(keys).size, 3, 'Triangles must not collapse');
    for (let edge = 0; edge < 3; edge++) {const key = [keys[edge], keys[(edge + 1) % 3]].sort().join('|'); edges.set(key, (edges.get(key) || 0) + 1);}
    const [a,b,c] = vertices;
    volume += (a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
  }
  assert.ok([...edges.values()].every(count => count === 2), 'Every joined edge has two faces');
  assert.ok(volume > 0); assert.ok(min[2] >= -.01);
  const dimensions = max.map((value, i) => Math.round((value - min[i]) * 10) / 10);
  assert.ok(Math.max(...dimensions) > 500, 'Parts retain millimetre scale');
  return {triangles, dimensions};
}

try {
  const catalog = await jsonAt('/data/catalog.json');
  const repairCatalog = await jsonAt('/data/repair-catalog.json');
  assert.deepEqual(await jsonAt('/data/repair-status.json'), {configured: false});
  assert.equal(catalog.vehicles.length, 1); assert.equal(catalog.regions.length, 3); assert.equal(catalog.styles.length, 3);
  assert.equal(Object.keys(repairCatalog.families).length, 5);
  const ready = repairCatalog.vehicles.filter(vehicle => vehicle.prepared); assert.ok(ready.length > 0);
  check('Static design/repair catalogs and unconfigured status are available', {preparedCars: ready.length});

  const options = ['stock', ...catalog.styles.map(style => style.id)];
  const combinations = [];
  for (const front of options) for (const sides of options) for (const rear of options) {
    if ([front, sides, rear].every(style => style === 'stock')) continue;
    combinations.push({front, sides, rear});
  }
  assert.equal(combinations.length, 63);
  let cursor = 0, totalParts = 0;
  await Promise.all(Array.from({length: 4}, async () => {
    while (cursor < combinations.length) {
      const selection = combinations[cursor++];
      const id = ['front', 'sides', 'rear'].map(region => selection[region]).join('-');
      const prefix = `/downloads/${id}/`;
      const exported = await jsonAt(prefix + 'export.json');
      const manifest = await jsonAt(prefix + 'manifest.json');
      const expectedSelection = Object.fromEntries(Object.entries(selection).filter(([,style]) => style !== 'stock'));
      const expectedParts = (selection.front !== 'stock' ? 1 : 0) + (selection.sides !== 'stock' ? 2 : 0) + (selection.rear !== 'stock' ? 1 : 0);
      assert.equal(exported.id, id); assert.equal(exported.vehicleId, catalog.vehicles[0].id);
      assert.deepEqual(exported.selections, expectedSelection); assert.deepEqual(manifest.selections, expectedSelection);
      assert.equal(exported.parts.length, expectedParts); assert.equal(manifest.parts.length, expectedParts);
      for (const item of [exported, manifest]) {
        assert.equal(item.units, 'mm'); assert.equal(item.upAxis, 'Z'); assert.equal(item.fitVerified, false); assert.equal(item.mountsIncluded, false);
      }
      assert.equal(exported.downloadUrl, prefix + 'kit.zip');
      const archive = unzipSync(await bytesAt(exported.downloadUrl));
      assert.deepEqual(decodeJSON(archive['manifest.json']), manifest);
      assert.equal(Object.keys(archive).length, expectedParts + 2);
      assert.deepEqual(await bytesAt(prefix + 'README.txt'), archive['README.txt']);
      for (const part of exported.parts) {
        assert.equal(part.url, prefix + part.name); assert.equal(selection[part.region], part.style);
        const bytes = await bytesAt(part.url); assert.deepEqual(bytes, archive[part.name]);
        const geometry = inspectSTL(bytes); assert.equal(geometry.triangles, part.triangles);
        assert.deepEqual(geometry.dimensions, part.dimensionsMm);
      }
      totalParts += expectedParts;
    }
  }));
  assert.equal(totalParts, 192);
  check('All 63 static kit combinations have correct manifests, archives and valid matching individual parts', {combinations: 63, partFiles: totalParts});

  browser = await chromium.launch({headless: true, args: ['--enable-unsafe-swiftshader']});
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, acceptDownloads: true, reducedMotion: 'reduce'});
  page = await context.newPage(); page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push({method: request.method(), url: request.url()}));
  page.on('response', response => {
    if (!/\.(glb|wasm|png)(\?|$)/.test(response.url())) return;
    const asset = {url: response.url(), status: response.status()}; assets.push(asset);
    response.finished().then(error => {asset.finished = !error; asset.timing = response.request().timing();});
  });
  const home = await page.goto(base, {waitUntil: 'domcontentloaded'}); assert.equal(home.status(), 200);
  await page.waitForFunction(() => document.getElementById('landing-load')?.hidden === true, null, {timeout: 180000});
  assert.ok(await page.locator('#landing-canvas canvas').isVisible());
  check('Landing page loads the real vehicle model');
  await page.screenshot({path: path.join(output, 'landing.png')});
  await page.locator('#landing-scroll-cue').click();
  await page.waitForFunction(() => document.getElementById('modes')?.getAttribute('aria-hidden') === 'false');
  await page.locator('#design-mode').click(); await page.locator('#setup').waitFor({state: 'visible'});
  await page.locator('#vehicle-form button[type=submit]').click();
  await page.waitForFunction(() => document.getElementById('loader')?.hidden === true, null, {timeout: 180000});
  assert.ok(await page.locator('#viewport canvas').isVisible()); assert.ok(await page.locator('#export-button').isDisabled());
  await page.locator('[data-style="sport"]').click(); await page.locator('#region-tabs [data-region="sides"]').click();
  await page.locator('[data-style="subtle"]').click(); assert.equal(await page.locator('#selected-count').textContent(), '2 modifications');
  const exportResponsePromise = page.waitForResponse(response => new URL(response.url()).pathname === '/downloads/sport-subtle-stock/export.json');
  await page.locator('#export-button').click(); const exportedResponse = await exportResponsePromise;
  assert.equal(exportedResponse.status(), 200); assert.equal(exportedResponse.request().method(), 'GET');
  const exported = await exportedResponse.json(); await page.locator('#result').waitFor({state: 'visible'});
  assert.equal(await page.locator('#parts-layout .part-card').count(), 3);
  const kitPromise = page.waitForEvent('download'); await page.locator('#download-kit').click();
  const kit = await kitPromise; const kitFile = path.join(output, 'kit.zip'); await kit.saveAs(kitFile);
  const downloaded = unzipSync(new Uint8Array(await readFile(kitFile)));
  assert.equal(Object.keys(downloaded).filter(name => name.endsWith('.stl')).length, 3);
  const partPromise = page.waitForEvent('download'); await page.locator('#parts-layout .part-card a').first().click();
  const part = await partPromise; const partFile = path.join(output, part.suggestedFilename()); await part.saveAs(partFile);
  assert.deepEqual(new Uint8Array(await readFile(partFile)), downloaded[exported.parts[0].name]);
  for (const entry of exported.parts) inspectSTL(downloaded[entry.name]);
  check('Design choices load their static export and browser downloads valid archive and individual part');
  await page.screenshot({path: path.join(output, 'download-results.png')});

  await page.goto(base + '/fix.html', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.querySelectorAll('#vehicle-list canvas').length === 1 && document.getElementById('showroom-name').textContent.length > 0, null, {timeout: 180000});
  const selected = ready.find(vehicle => /corolla/i.test(vehicle.id)) || ready[0];
  await page.locator('#vehicle-list').focus();
  for (let index = 0; index < ready.indexOf(selected); index++) await page.keyboard.press('ArrowRight');
  await page.waitForFunction(label => document.getElementById('vehicle-list').getAttribute('aria-label') === label, `Select ${selected.make} ${selected.model}`);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.getElementById('viewer-controls')?.hidden === false, null, {timeout: 180000});
  assert.ok(await page.locator('#viewport canvas').isVisible()); assert.ok(await page.locator('#confirm-repair').isDisabled());
  await page.locator('#explode').fill('100'); assert.equal(await page.locator('#assembly-state').textContent(), 'Exploded');
  await page.locator('#viewer-controls summary').click();
  await page.locator('.part-row').first().click(); assert.ok(await page.locator('#part-inspect').isVisible());
  await page.locator('#isolate').click(); assert.equal(await page.locator('#isolate').textContent(), 'Show complete car'); await page.locator('#isolate').click();
  check('Repair showroom, real model, explosion and part isolation work on static hosting');
  const testPhoto = await readFile(new URL('../../design_mod/public/assets/ferrari_ao.png', import.meta.url));
  await page.locator('#damage-photos').setInputFiles({name: 'test-part.png', mimeType: 'image/png', buffer: testPhoto});
  await page.locator('#message-input').fill('Keep this test photo and message in my browser.');
  await page.locator('#send-message').click(); await page.locator('#chat-error').waitFor({state: 'visible'});
  assert.match(await page.locator('#chat-error').textContent(), /not configured/);
  assert.match(await page.locator('#chat-error').textContent(), /remain in this browser/);
  assert.equal(await page.locator('#photos .photo').count(), 1);
  assert.equal(await page.locator('#message-input').inputValue(), 'Keep this test photo and message in my browser.');
  assert.ok(await page.locator('#send-message').isEnabled()); assert.ok(await page.locator('#confirm-repair').isDisabled());
  assert.deepEqual(requests.filter(request => !['GET', 'HEAD', 'OPTIONS'].includes(request.method)), []);
  assert.deepEqual(requests.filter(request => new URL(request.url).pathname.startsWith('/api/')), []);
  check('Repair Send explains unavailable review, preserves photo/text and issues no outgoing POST or legacy service request');
  await page.screenshot({path: path.join(output, 'repair-workspace.png')});
  assert.deepEqual(errors, []); assert.ok(assets.some(asset => asset.url.includes('corolla')));
  assert.ok(assets.every(asset => asset.status === 200 && asset.finished));
  check('No browser exceptions or failed model, decoder or texture loads');
} catch (error) {
  failure = error.stack || String(error);
  if (page) await page.screenshot({path: path.join(output, 'failure.png')}).catch(() => {});
  throw error;
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify({base, checkedAt: new Date().toISOString(), checks, failure, errors, assets, requests}, null, 2));
  await browser?.close();
  console.log(`Report: ${path.join(output, 'report.json')}`);
}
