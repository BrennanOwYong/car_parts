// Live computer-aided design (CAD) attachment workflow; no substituted server responses.
// References: https://playwright.dev/docs/api/class-locator#locator-set-input-files
// https://playwright.dev/docs/api/class-download#download-path
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {focusPreparedVehicle} from './browser_support.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.STUDIO_URL || 'http://127.0.0.1:8788';
const artifacts = process.env.TEST_ARTIFACTS || path.join(os.tmpdir(), 'car-parts-browser-results');
await mkdir(artifacts, {recursive:true});
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce',acceptDownloads:true});
page.setDefaultTimeout(15000);
const checks = [], errors = [], failures = [];
let analysisRequests = 0;
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => {
  if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/repair/chat') analysisRequests++;
});
const pass = message => {checks.push(message); console.log('PASS ' + message);};
const storage = () => page.evaluate(() => JSON.parse(localStorage.getItem('forma-cad-evidence-v1') || '{}'));
async function ready() {
  await page.locator('#viewer-controls').waitFor({state:'visible',timeout:45000});
  assert.equal(await page.locator('#explode').inputValue(), '50');
}
async function observeActualViewer() {
  await page.evaluate(async () => {
    const resource = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/fix-viewer.js');
    const {RepairViewer} = await import(resource.name);
    const select = RepairViewer.prototype.select;
    RepairViewer.prototype.select = function(id) {window.__cadViewer = this; return select.call(this,id);};
  });
}
async function selectPart(id) {
  await page.locator('#parts-list').evaluate(list => {list.parentElement.open=true;});
  await page.locator(`#parts-list .part-row[data-id="${id}"]`).click();
}
async function materialSnapshot(id) {
  return page.evaluate(id => {
    const group = window.__cadViewer.groups.get(id);
    return {edited:!!group.userData.edited, materials:group.userData.highlightMaterials.map(material => ({color:material.color.getHex(),emissive:material.emissive.getHex(),intensity:material.emissiveIntensity}))};
  },id);
}
async function viewDownload(expectedName, expectedBytes) {
  const pending = page.waitForEvent('download');
  await page.locator('.edit-annotation').click();
  const download = await pending;
  assert.equal(download.suggestedFilename(),expectedName);
  const bytes = await readFile(await download.path());
  if (expectedBytes) assert.deepEqual(bytes,expectedBytes);
  return bytes;
}

try {
  await page.goto(base + '/fix.html');
  await focusPreparedVehicle(page,'corolla-prepared-demo');
  await observeActualViewer();
  await page.locator('#vehicle-list').focus(); await page.keyboard.press('Enter');
  await ready();
  assert.equal(await page.locator('#parts-list .part-row').count(),43);
  assert.equal(await page.locator('#modified-parts .modification-record').count(),0);
  await selectPart('front-bumper');
  assert.equal(await page.locator('#part-heading').innerText(),'Front bumper');
  await selectPart('hood');
  // Select a different part before recording its baseline so selection itself is excluded.
  await selectPart('front-bumper');
  await page.waitForFunction(() => window.__cadViewer.groups.get('hood').userData.highlightMaterials.every(m => m.emissiveIntensity === m.userData.original.emissiveIntensity));
  const hoodBefore = await materialSnapshot('hood');
  await page.locator('#demo-cad').click();
  await page.waitForFunction(() => document.querySelectorAll('#modified-parts .modification-record').length === 1);
  assert.match(await page.locator('#cad-status').innerText(),/front-bumper-custom\.scad mapped to Front bumper/);
  await page.waitForFunction(() => document.querySelector('.edit-annotation')?.textContent.includes('Front bumper · Modified'));
  assert.equal(await page.locator('.edit-annotation').isVisible(),true);
  assert.equal(await page.locator('#parts-list .part-row.modified').count(),1);
  await page.waitForFunction(() => window.__cadViewer.groups.get('front-bumper').userData.highlightMaterials.some(m => m.emissive.getHex() === 0x328dc7 && m.emissiveIntensity > 0));
  assert.equal((await materialSnapshot('front-bumper')).edited,true);
  assert.deepEqual(await materialSnapshot('hood'),hoodBefore);
  const demo = await viewDownload('front-bumper-custom.scad');
  assert.match(demo.toString(),/Demo replacement: Front bumper/);
  assert.match(demo.toString(),/Placeholder geometry/);
  await page.locator('#parts-list').evaluate(list => {list.parentElement.open=false;});
  const screenshot = path.join(artifacts,'cad-mapping-corolla-desktop.png');
  await page.screenshot({path:screenshot,timeout:20000}); console.log('SCREENSHOT ' + screenshot);
  pass('All 43 Corolla parts are selectable; front-bumper demo attachment creates one record, annotation, exact download, and targeted blue material without changing the hood');

  const uploadName = 'Toyota-Corolla-right-mirror-replacement.STEP';
  const uploadBytes = Buffer.from('ISO-10303-21;\r\nHEADER;\r\n/* FORMA attachment fixture: exact bytes retained */\r\nENDSEC;\r\nEND-ISO-10303-21;\r\n');
  await page.locator('#cad-file').setInputFiles({name:uploadName,mimeType:'application/octet-stream',buffer:uploadBytes});
  await page.waitForFunction(() => document.getElementById('cad-status').textContent.includes('mapped to Right mirror'));
  assert.equal(await page.locator('#part-heading').innerText(),'Right mirror');
  assert.equal(await page.locator('#modified-parts .modification-record').count(),2);
  await page.waitForFunction(() => document.querySelector('.edit-annotation')?.textContent.includes('Right mirror · Modified'));
  await viewDownload(uploadName,uploadBytes);
  const savedBeforeReject = await storage();
  assert.deepEqual(Object.keys(savedBeforeReject['corolla-prepared-demo']).sort(),['front-bumper','right-mirror']);
  for (const name of ['hood-front-bumper.step','unknown-part.step']) {
    await page.locator('#cad-file').setInputFiles({name,mimeType:'application/octet-stream',buffer:Buffer.from('attachment fixture')});
    await page.waitForFunction(() => document.getElementById('cad-status').textContent.startsWith('Name the file after one part'));
    assert.deepEqual(await storage(),savedBeforeReject);
    assert.equal(await page.locator('#modified-parts .modification-record').count(),2);
  }
  pass('Filename maps the uploaded STEP file to Right mirror independently of the selected bumper; download bytes/name are exact and ambiguous or unknown filenames change nothing');

  await page.reload(); await ready(); await observeActualViewer();
  assert.equal(await page.locator('#parts-list .part-row').count(),43);
  assert.equal(await page.locator('#modified-parts .modification-record').count(),2);
  assert.deepEqual(await storage(),savedBeforeReject);
  await page.locator('#modified-parts .modification-record[data-part-id="right-mirror"]').click();
  await page.waitForFunction(() => document.querySelector('.edit-annotation')?.textContent.includes('Right mirror · Modified'));
  await viewDownload(uploadName,uploadBytes);
  pass('Reload restores both modified records, their part selection, annotation, and exact uploaded file');

  await page.locator('#change-car').click();
  await focusPreparedVehicle(page,'ferrari-458-demo');
  await page.locator('#vehicle-list').focus(); await page.keyboard.press('Enter'); await ready();
  assert.match(await page.locator('#vehicle-title').innerText(),/Ferrari 458/);
  assert.equal(await page.locator('#modified-parts .modification-record').count(),0);
  assert.equal(await page.locator('#parts-list .part-row.modified').count(),0);
  await page.waitForFunction(() => document.querySelector('.edit-annotation').hidden);
  assert.deepEqual(await storage(),savedBeforeReject);
  await page.locator('#change-car').click();
  await focusPreparedVehicle(page,'corolla-prepared-demo');
  await page.locator('#vehicle-list').focus(); await page.keyboard.press('Enter'); await ready();
  assert.equal(await page.locator('#modified-parts .modification-record').count(),2);
  assert.equal(analysisRequests,0); assert.deepEqual(errors,[]);
  pass('Ferrari shows no Corolla modifications; returning restores Corolla edits, with zero analysis requests or browser exceptions');
} catch(error) {
  failures.push(error.stack || error.message); console.error('FAIL ' + (error.stack || error.message));
  console.error(JSON.stringify(await page.evaluate(() => ({vehicle:document.getElementById('vehicle-title')?.textContent,showroom:document.getElementById('showroom-name')?.textContent,error:document.getElementById('error')?.textContent,cadStatus:document.getElementById('cad-status')?.textContent})).catch(() => ({}))));
  process.exitCode=1;
} finally {
  await writeFile(path.join(artifacts,'cad-mapping-results.json'),JSON.stringify({checks,errors,failures,analysisRequests},null,2));
  await browser.close();
}
