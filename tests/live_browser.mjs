// Playwright references (checked 2026-09-13):
// https://playwright.dev/docs/api/class-page
// https://playwright.dev/docs/api/class-locator#locator-set-input-files
// https://playwright.dev/docs/api/class-browser#browser-new-context
// Run with PLAYWRIGHT_MODULE set to the installed playwright entry point when it is outside this repository.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const studio = process.env.STUDIO_URL || 'http://127.0.0.1:8788';
const relay = process.env.RELAY_URL || 'http://localhost:8787';
const artifacts = process.env.TEST_ARTIFACTS || path.join(os.tmpdir(), 'car-parts-browser-results');
await mkdir(artifacts, {recursive: true});
const checks = [];
const failures = [];
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
const page = await context.newPage();
const errors = [];
const limitations = [];
page.on('pageerror', error => errors.push(error.message));
async function check(name, work) {
  try {await work();checks.push(name);console.log(`PASS ${name}`);}
  catch (error) {failures.push({name, error: error.message});console.error(`FAIL ${name}: ${error.message}`);await page.screenshot({path: path.join(artifacts, `failure-${failures.length}.png`), fullPage: true}).catch(()=>{});}
}
try {
  await check('Live repair catalog distinguishes the four requested sources and the prepared local demo', async () => {
    const response = await page.request.get(studio + '/api/repair/catalog');
    assert.equal(response.status(), 200);
    const catalog = await response.json();
    const requested = catalog.vehicles.filter(vehicle => !vehicle.demo);
    assert.equal(requested.length, 4);
    for (const vehicle of requested) {
      assert.ok(['awaiting_download', 'needs_preparation', 'prepared'].includes(vehicle.status));
      assert.equal(Boolean(vehicle.prepared), vehicle.status === 'prepared');
      if (vehicle.prepared) {
        assert.equal(vehicle.prepared.vehicleId, vehicle.id);
        assert.equal(vehicle.prepared.source.url, vehicle.url);
        assert.notEqual(vehicle.prepared.localDemo, true);
      }
    }
    const demo = catalog.vehicles.find(vehicle => vehicle.demo);
    assert.equal(demo.id, 'corolla-prepared-demo');
    assert.equal(demo.status, 'prepared');
    assert.equal(demo.prepared.parts.length, 43);
    assert.equal(demo.prepared.fitVerified, false);
    assert.match(demo.license, /unverified/i);
    const binary = await page.request.get(studio + demo.prepared.asset);
    assert.equal(binary.status(), 200);
    assert.equal((await binary.body()).readUInt32LE(0), 0x46546c67);
  });
  await check('Live repair boundary rejects invalid input and reports real service configuration', async () => {
    assert.equal((await page.request.post(studio + '/api/repair/chat', {data: 'not json'})).status(), 400);
    assert.equal((await page.request.post(studio + '/api/repair/chat', {data: {phase: 'unsupported'}})).status(), 400);
    assert.equal((await page.request.post(studio + '/api/repair/chat', {headers: {origin: 'https://foreign.example'}, data: {phase: 'repair_chat'}})).status(), 403);
    const status = await page.request.get(studio + '/api/repair/status');
    assert.equal(status.status(), 200);
    const config = await status.json();
    assert.equal(typeof config.configured, 'boolean');
    if (config.configured) {limitations.push('Configured external service not called by the deterministic browser checks.');return;}
    const invalid = await page.request.post(studio + '/api/repair/chat', {data: {phase: 'repair_chat', vehicle_asset_id: '../../private'}});
    assert.equal(invalid.status(), 400);
    assert.match((await invalid.json()).error, /catalog vehicle/i);
    const result = await page.request.post(studio + '/api/repair/chat', {data: {
      phase: 'repair_chat', vehicle_asset_id: 'corolla-prepared-demo',
      images_base64: [Buffer.from([0xff,0xd8,0xff,0xe0]).toString('base64')],
      messages: [{role: 'user', text: 'Review the visible damage.'}], selected_damage_parts: []
    }});
    assert.equal(result.status(), 503);
    assert.match((await result.json()).error, /OPENAI_API_KEY is not set/);
    limitations.push('External service key missing: no live image recognition or generated repair response verified.');
  });
  await check('Live landing and complete design export', async () => {
    await page.goto(studio);
    await page.locator('#design-mode').click();
    await page.locator('#vehicle-form').waitFor({state: 'visible'});
    await page.locator('#vehicle-form button[type=submit]').click();
    await page.locator('#loader').waitFor({state: 'hidden', timeout: 60000});
    assert.equal(await page.locator('#viewport canvas').count(), 1);
    const options = page.locator('#style-options button');
    assert.ok(await options.count() >= 3);
    await options.nth(1).click();
    assert.equal(await page.locator('#export-button').isEnabled(), true);
    await page.locator('#export-button').click();
    await page.locator('#result').waitFor({state: 'visible'});
    const response = await page.request.get(new URL(await page.locator('#download-kit').getAttribute('href'), studio).href);
    assert.equal(response.status(), 200);
    assert.equal(response.headers()['content-type'], 'application/zip');
    assert.ok((await response.body()).length > 100);
  });
  await check('Live photo preparation and explicit send gate', async () => {
    await page.goto(relay);
    assert.equal(await page.locator('#send-button').isDisabled(), true);
    let analyses = 0;
    const onRequest = request => {if (new URL(request.url()).pathname === '/analyze') analyses++;};
    page.on('request', onRequest);
    await page.locator('#part-photo').setInputFiles(fileURLToPath(new URL('../design_mod/public/assets/ferrari_ao.png', import.meta.url)));
    await page.locator('#photo-preview').waitFor({state: 'visible'});
    assert.equal(await page.locator('#send-button').isDisabled(), true);
    await page.locator('#message-input').fill('Please repair the visible front bumper damage.');
    assert.equal(await page.locator('#send-button').isEnabled(), true);
    assert.equal(analyses, 0, 'Selecting a photo and typing does not submit it');
    page.off('request', onRequest);
  });
  await check('Live relay rejects invalid body and private routes', async () => {
    assert.equal((await page.request.post(relay + '/analyze', {data: 'not json'})).status(), 400);
    assert.equal((await page.request.get(relay + '/astra_relay.py')).status(), 404);
    assert.deepEqual(await (await page.request.get(relay + '/health')).json(), {status: 'ok'});
  });
  await check('No uncaught browser exceptions', async () => assert.deepEqual(errors, []));
} finally {
  await writeFile(path.join(artifacts, 'results.json'), JSON.stringify({studio, relay, checks, failures, errors, limitations}, null, 2));
  await browser.close();
}
if (failures.length) process.exitCode = 1;
