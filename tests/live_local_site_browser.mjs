// Local built-page smoke only. This runner never edits the Site checkout or publishes.
// References: https://playwright.dev/docs/api/class-page
// https://playwright.dev/docs/api/class-download#download-path
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.LOCAL_SITE_URL||'http://127.0.0.1:8792';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Only a local preview may be tested');
const artifacts=process.env.TEST_ARTIFACTS||path.join(os.tmpdir(),'car-parts-browser-results');
await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce',acceptDownloads:true});
page.setDefaultTimeout(15000);
const checks=[],errors=[],failures=[],apiPosts=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname.startsWith('/api/'))apiPosts.push(new URL(request.url()).pathname);});
const pass=message=>{checks.push(message);console.log('PASS '+message);};
const staticErrorOnly=process.env.STATIC_ERROR_ONLY==='1';
async function ready(){await page.locator('#viewer-controls').waitFor({state:'visible',timeout:45000});}
try {
  if(!staticErrorOnly){
  const response=await page.goto(base+'/fix.html');assert.equal(response.status(),200);
  await page.waitForFunction(()=>document.getElementById('showroom-name').textContent.startsWith('Ferrari 458'),null,{timeout:45000});
  assert.equal(await page.locator('#vehicle-list canvas').count(),1);
  assert.equal(await page.locator('#showroom-previous').isDisabled(),true);
  assert.equal(await page.locator('#showroom-next').isEnabled(),true);
  await page.locator('#showroom-next').click();
  await page.waitForFunction(()=>document.getElementById('showroom-name').textContent==='Toyota Corolla · 2020');
  assert.equal(await page.locator('#showroom-previous').isEnabled(),true);
  assert.equal(await page.locator('#showroom-next').isDisabled(),true);
  await page.locator('#vehicle-list').focus();await page.keyboard.press('Enter');await ready();
  assert.equal(await page.locator('#parts-list .part-row').count(),43);
  assert.equal(await page.locator('#explode').inputValue(),'50');
  pass('The local build exposes two real car choices and opens Corolla with 43 parts at 50%');

  await page.locator('#parts-list').evaluate(list=>{list.parentElement.open=true;});
  await page.locator('#parts-list .part-row[data-id="front-bumper"]').click();
  await page.locator('#demo-cad').click();
  await page.waitForFunction(()=>document.querySelector('#modified-parts .modification-record')?.dataset.partId==='front-bumper');
  const saved=await page.evaluate(()=>localStorage.getItem('forma-cad-evidence-v1'));
  assert.ok(saved.includes('front-bumper-custom.scad'));
  await page.reload();await ready();
  assert.equal(await page.locator('#modified-parts .modification-record').count(),1);
  assert.equal(await page.locator('#modified-parts .modification-record').getAttribute('data-part-id'),'front-bumper');
  assert.equal(await page.evaluate(()=>localStorage.getItem('forma-cad-evidence-v1')),saved);
  pass('Creating demo bumper CAD records the edit and restores it after reload');

  const libraryResponse=page.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/repair-library.json'));
  await page.locator('#saved-parts').click();
  const library=await(await libraryResponse).json();
  assert.equal(library.parts.length,6);
  assert.equal(await page.locator('#repair-downloads .download-card').count(),6);
  await page.waitForFunction(()=>[...document.querySelectorAll('#repair-downloads img')].length===6&&[...document.querySelectorAll('#repair-downloads img')].every(image=>image.complete&&image.naturalWidth>0));
  const pendingDownload=page.waitForEvent('download');
  await page.locator('#repair-downloads .download-card').first().getByRole('button',{name:'Fitted concept ↓',exact:true}).click();
  const download=await pendingDownload;
  assert.equal(download.suggestedFilename(),`${library.parts[0].id}-fitted.scad`);
  assert.equal(await readFile(await download.path(),'utf8'),library.parts[0].cadPayload);
  pass('Six bundled saved-part previews load and the fitted download contains the exact saved file');
  }else{
    await page.goto(base+'/fix.html?vehicle=corolla-prepared-demo');await ready();
  }

  const photoBytes=await readFile(new URL('../design_mod/public/assets/ferrari_ao.png',import.meta.url));
  await page.locator('#damage-photos').setInputFiles({name:'local-static-check.png',mimeType:'image/png',buffer:photoBytes});
  const draft='Keep this local draft while the hosted service is unavailable.';
  await page.locator('#message-input').fill(draft);
  await page.waitForFunction(()=>document.querySelectorAll('#photos .photo').length===1&&!document.getElementById('message-input').disabled);
  await page.locator('#send-message').click();
  await page.locator('#chat-error').waitFor({state:'visible'});
  assert.match(await page.locator('#chat-error').innerText(),/unavailable|not configured|not connected|not available|local|server|preview/i);
  assert.equal(await page.locator('#photos .photo').count(),1);
  assert.equal(await page.locator('#message-input').inputValue(),draft);
  assert.deepEqual(apiPosts,[]);assert.deepEqual(errors,[]);
  pass('Static Astra submission reports unavailability, retains the photo and draft, and makes no API POST request; no browser exceptions');
}catch(error){failures.push(error.stack||error.message);console.error('FAIL '+(error.stack||error.message));console.error(JSON.stringify(await page.evaluate(()=>({title:document.getElementById('showroom-name')?.textContent,error:document.getElementById('error')?.textContent,chatError:document.getElementById('chat-error')?.textContent})).catch(()=>({}))));process.exitCode=1;}
finally{await writeFile(path.join(artifacts,staticErrorOnly?'local-site-static-error-results.json':'local-site-smoke-results.json'),JSON.stringify({base,checks,errors,failures,apiPosts},null,2));await browser.close();}
