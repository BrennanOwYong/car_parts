// Focused live merge regression: main navigation, stable repair assets, and three learning courses.
// References: https://playwright.dev/docs/api/class-page and https://playwright.dev/docs/api/class-locator
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {focusPreparedVehicle} from './browser_support.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.STUDIO_URL||'http://127.0.0.1:8788',artifacts=path.join(os.tmpdir(),'car-parts-browser-results');
await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
page.setDefaultTimeout(15000);
const checks=[],errors=[],failures=[];let analysisRequests=0;
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/repair/chat')analysisRequests++;});
const pass=message=>{checks.push(message);console.log('PASS '+message);};
const learningOnly=process.env.LEARNING_ONLY==='1';
async function mainModes(){
  await page.goto(base+'/');
  await page.locator('#landing-scroll-cue').click();
  await page.waitForFunction(()=>!document.getElementById('modes').inert,null,{timeout:45000});
  assert.equal(await page.locator('#design-mode').isEnabled(),true);
  assert.equal(await page.locator('#learning-mode').isEnabled(),true);
  assert.equal(await page.locator('#fix-mode').getAttribute('href'),'/fix.html');
}
try{
  if(!learningOnly){
  const design=await(await page.request.get(base+'/api/catalog')).json();
  assert.deepEqual(design.vehicles.map(v=>v.id),['ferrari-458-demo','toyota-corolla-2020','porsche-911-carrera-4s']);
  assert.ok(Number.isInteger(design.schemaVersion));
  await mainModes();await page.locator('#fix-mode').click();
  await page.waitForURL('**/fix.html');
  await focusPreparedVehicle(page,'corolla-prepared-demo');
  await page.locator('#vehicle-list').focus();await page.keyboard.press('Enter');
  await page.locator('#viewer-controls').waitFor({state:'visible',timeout:45000});
  assert.equal(await page.locator('#parts-list .part-row').count(),43);
  assert.equal(await page.locator('#explode').inputValue(),'50');
  assert.match(await page.locator('#vehicle-title').innerText(),/Toyota Corolla/);
  pass('Merged three-car design catalog remains valid; main Explore reaches enabled Fix part and the stable 43-part Corolla repair asset');
  }

  await mainModes();await page.locator('#learning-mode').click();await page.waitForURL('**/learning.html');
  assert.equal(await page.locator('.complete-collection .vehicle-card').count(),3);
  for(const slug of ['porsche','ferrari','toyota'])assert.equal(await page.locator(`.vehicle-card[href="#car/${slug}"]`).count(),1);
  await page.locator('.vehicle-card[href="#car/toyota"]').click();
  await page.waitForURL('**/learning.html#car/toyota');
  await page.waitForFunction(()=>document.getElementById('skip-intro')&&!document.getElementById('skip-intro').disabled,null,{timeout:45000});
  if(await page.locator('#skip-intro').isVisible())await page.locator('#skip-intro').click();
  await page.waitForFunction(()=>!document.getElementById('assembly').disabled);
  assert.equal(await page.locator('#car-scene canvas').count(),1);
  assert.equal(await page.locator('.module-grid .module').count(),7);
  await page.locator('#assembly').focus();await page.keyboard.press('End');
  assert.equal(await page.locator('#assembly-value').innerText(),'100%');
  pass('Main Immersive learning retains all three courses; Toyota loads its actual scene, assembly control, and seven modules');

  await page.locator('.module[data-lesson="wheels"]').click();await page.waitForURL('**/learning.html#lesson/toyota/wheels/0');
  await page.waitForFunction(()=>document.querySelectorAll('#part-buttons button').length>0,null,{timeout:45000});
  assert.match(await page.locator('#model-note').innerText(),/SOURCE TRIANGLES/);
  await page.locator('#continue').click();await page.waitForURL('**/learning.html#lesson/toyota/wheels/1');
  const progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('forma-learning-v1')));
  assert.equal(progress['toyota:wheels:0'],true);assert.equal(progress['porsche:wheels:0'],undefined);assert.equal(progress['ferrari:wheels:0'],undefined);
  assert.equal(await page.locator('#lab-input').count(),1);assert.ok((await page.locator('#result-value').innerText()).length>0);
  assert.deepEqual(errors,[]);assert.equal(analysisRequests,0);
  pass('Toyota wheel lesson keeps real source components, working chapter navigation and car-specific progress; no browser exceptions or analysis requests');
}catch(error){failures.push(error.stack||error.message);console.error('FAIL '+(error.stack||error.message));console.error(JSON.stringify(await page.evaluate(()=>({url:location.href,modeError:document.getElementById('mode-error')?.textContent,error:document.getElementById('error')?.textContent,loading:[...document.querySelectorAll('.scene-loading')].map(x=>x.textContent)})).catch(()=>({}))));process.exitCode=1;}
finally{await writeFile(path.join(artifacts,learningOnly?'merged-learning-results.json':'merged-navigation-results.json'),JSON.stringify({checks,errors,failures,analysisRequests},null,2));await browser.close();}
