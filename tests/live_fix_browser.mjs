// Live application and actual viewer integration checks. No successful assistant replies are mocked.
// References: https://playwright.dev/docs/api/class-page and https://playwright.dev/docs/api/class-locator
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {focusPreparedVehicle} from './browser_support.mjs';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.STUDIO_URL || 'http://127.0.0.1:8788';
const artifacts = process.env.TEST_ARTIFACTS || path.join(os.tmpdir(), 'car-parts-browser-results');
await mkdir(artifacts, {recursive: true});
const photoBytes = await readFile(fileURLToPath(new URL('../design_mod/public/assets/ferrari_ao.png', import.meta.url)));
const photo = name => ({name, mimeType: 'image/png', buffer: photoBytes});
const checks = [], failures = [], errors = [], skipped = [];
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({viewport: {width: 1440, height: 1100}, reducedMotion: 'reduce'});
let page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
async function check(name, work) {
  if (process.env.FIX_CHECK_FILTER && !new RegExp(process.env.FIX_CHECK_FILTER).test(name)) return;
  try {const result=await work();if(result?.skipped){skipped.push({name,reason:result.skipped});console.log(`SKIP ${name}: ${result.skipped}`);return;}checks.push(name);console.log(`PASS ${name}`);}
  catch (error) {failures.push({name,error:error.message});console.error(`FAIL ${name}: ${error.message}`);await page.screenshot({path:path.join(artifacts,`fix-failure-${failures.length}.png`),fullPage:true}).catch(()=>{});}
}
async function openDemo() {
  await page.goto(base + '/fix.html?vehicle=corolla-prepared-demo');
  await page.locator('#viewer-controls').waitFor({state:'visible',timeout:60000});
}
async function nextFrames(count=3) {await page.evaluate(count => new Promise(resolve => {let i=0;function frame(){if(++i>=count)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);}),count);}
try {
  await check('Landing Explore opens the continuous showroom and the same car enters repair', async () => {
    const assetRequests = new Set(); page.on('request', request => assetRequests.add(new URL(request.url()).pathname));
    await page.goto(base);
    await page.locator('#landing-scroll-cue').click();
    await page.waitForFunction(()=>document.getElementById('modes').getAttribute('aria-hidden')==='false');
    await page.locator('#fix-mode').click();
    await focusPreparedVehicle(page,'corolla-prepared-demo');
    const catalog = await (await page.request.get(base + '/api/repair/catalog')).json();
    const demo = catalog.vehicles.find(v => v.id === 'corolla-prepared-demo');
    assert.ok(assetRequests.has(demo.animatedAsset), 'Landing uses the registry animation asset');
    assert.ok(assetRequests.has(demo.prepared.asset), 'Showroom uses the registry prepared asset');
    assert.equal(await page.locator('#car-picker canvas').count(),1);
    assert.equal(await page.locator('#car-picker img,#car-picker article,.vehicle-card,.showroom-car').count(),0);
    assert.equal(await page.locator('#pending-list,#pending-models,#ready-count').count(),0);
    assert.equal(await page.getByRole('button',{name:'Previous car',exact:true}).isDisabled(),catalog.vehicles.filter(v=>v.prepared).length<2);
    await page.screenshot({path:path.join(artifacts,'fix-carousel-desktop.png'),fullPage:true});
    await page.getByRole('button',{name:'Select Toyota Corolla',exact:true}).focus(); await page.keyboard.press('Enter');
    await page.locator('#viewer-controls').waitFor({state:'visible',timeout:60000});
    assert.equal(await page.locator('#explode').inputValue(),'50');
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    assert.equal(await page.locator('#credits,#vehicle-meta,#asset-status,#photo-note,#showroom-meta').count(),0);
    assert.equal(await page.locator('#viewport canvas').count(),1);
    const stage = await page.locator('.stage').boundingBox(), chat = await page.locator('.conversation').boundingBox();
    assert.ok(stage.x+stage.width<=chat.x+2 && Math.abs(stage.y-chat.y)<2);
    await page.screenshot({path:path.join(artifacts,'fix-workspace-desktop.png'),fullPage:true});
    await page.locator('#viewer-controls summary').click();
    await page.locator('.part-row[data-id="left-front-fender"]').click();
    assert.equal(await page.locator('#part-heading').textContent(),'Left front fender');
    await page.locator('#isolate').click();
    assert.equal(await page.locator('#isolate').textContent(),'Show complete car');
    await page.locator('#reset-view').click();
    assert.equal(await page.locator('#isolate').textContent(),'Isolate part');
    await page.locator('#explode').fill('0');
    assert.equal(await page.locator('#assembly-state').textContent(),'Assembled');
    await page.locator('#explode').fill('100');
    assert.equal(await page.locator('#assembly-state').textContent(),'Exploded');
  });
  await check('Multiple photos, six-photo limit, removal, paste and invalid batch are local and atomic', async () => {
    await openDemo();
    let posts=0; const handler=request=>{if(new URL(request.url()).pathname==='/api/repair/chat')posts++;};page.on('request',handler);
    await page.locator('#damage-photos').setInputFiles([photo('front.png'),photo('left.png')]);
    await page.waitForFunction(()=>document.querySelectorAll('#photos .photo').length===2);
    assert.equal(await page.locator('#send-message').isEnabled(),true);
    assert.equal(await page.locator('#confirm-repair').isDisabled(),true);
    await page.locator('#damage-photos').setInputFiles([photo('3.png'),photo('4.png'),photo('5.png'),photo('6.png'),photo('7.png')]);
    await page.locator('#chat-error').waitFor({state:'visible'});
    assert.match(await page.locator('#chat-error').textContent(),/six photos/);
    assert.equal(await page.locator('#photos .photo').count(),2);
    await page.locator('#damage-photos').setInputFiles([photo('3.png'),photo('4.png'),photo('5.png'),photo('6.png')]);
    await page.waitForFunction(()=>document.querySelectorAll('#photos .photo').length===6);
    await page.getByRole('button',{name:'Remove photo left.png',exact:true}).click();
    assert.equal(await page.locator('#photos .photo').count(),5);
    await page.evaluate(encoded => {
      const transfer=new DataTransfer(), bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
      transfer.items.add(new File([bytes],'pasted.png',{type:'image/png'}));
      document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:transfer,bubbles:true,cancelable:true}));
    },photoBytes.toString('base64'));
    await page.waitForFunction(()=>document.querySelectorAll('#photos .photo').length===6);
    await page.locator('#new-review').click();
    assert.equal(await page.locator('#photos .photo').count(),0);
    await page.locator('#damage-photos').setInputFiles([photo('good.png'),{name:'not-image.txt',mimeType:'text/plain',buffer:Buffer.from('invalid')}]);
    await page.waitForFunction(()=>!document.getElementById('chat-error').hidden);
    assert.match(await page.locator('#chat-error').textContent(),/Choose a JPEG/);
    assert.equal(await page.locator('#photos .photo').count(),0);
    assert.equal(posts,0,'Adding/removing/pasting photos never sends them');page.off('request',handler);
  });
  await check('Actual missing-key retry retains photos and text without duplicate conversation entries', async () => {
    await openDemo();
    const status=await (await page.request.get(base+'/api/repair/status')).json();
    if(status.configured) return {skipped:'Service key is configured; no synthetic photo was sent.'};
    await page.locator('#damage-photos').setInputFiles([photo('damage.png')]);
    await page.waitForFunction(()=>document.querySelectorAll('#photos .photo').length===1);
    await page.locator('#message-input').fill('Please inspect the left front fender.');
    for(let attempt=0;attempt<2;attempt++) {
      await page.locator('#send-message').click();
      await page.waitForFunction(()=>!document.getElementById('chat-error').hidden && document.getElementById('working').hidden);
      assert.match(await page.locator('#chat-error').textContent(),/OPENAI_API_KEY is not set/);
      assert.equal(await page.locator('#message-input').inputValue(),'Please inspect the left front fender.');
      assert.equal(await page.locator('#photos .photo').count(),1);
      assert.equal(await page.locator('#chat-log .message.user').count(),0);
      assert.equal(await page.locator('#send-message').isEnabled(),true);
      assert.equal(await page.locator('#confirm-repair').isDisabled(),true);
    }
    await page.locator('#new-review').click();
    assert.equal(await page.locator('#message-input').inputValue(),'');
    assert.equal(await page.locator('#photos .photo').count(),0);
    assert.equal(await page.locator('#chat-error').isHidden(),true);
    await page.locator('#change-car').click();
    assert.equal(await page.locator('#car-picker').isVisible(),true);
    await page.getByRole('button',{name:'Select Toyota Corolla',exact:true}).focus(); await page.keyboard.press('Enter');
    await page.locator('#viewer-controls').waitFor({state:'visible',timeout:60000});
    assert.equal(await page.locator('#chat-log .message').count(),1);
    assert.equal(await page.locator('#selected-count').textContent(),'0');
  });
  await check('Local new review and car switching clear draft photos and text without calling Astra', async () => {
    await openDemo();
    await page.locator('#damage-photos').setInputFiles([photo('reset-photo.png')]);
    await page.waitForFunction(()=>document.querySelectorAll('#photos .photo').length===1);
    await page.locator('#message-input').fill('A local draft that must clear.');
    await page.locator('#new-review').click();
    assert.equal(await page.locator('#message-input').inputValue(),'');
    assert.equal(await page.locator('#photos .photo').count(),0);
    await page.locator('#change-car').click();
    await page.getByRole('button',{name:'Select Toyota Corolla',exact:true}).focus(); await page.keyboard.press('Enter');
    await page.locator('#viewer-controls').waitFor({state:'visible',timeout:60000});
    assert.equal(await page.locator('#selected-count').textContent(),'0');
    assert.equal(await page.locator('#chat-log .message').count(),1);
  });
  await check('Mobile showroom and repair workspace do not overflow the document', async () => {
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+'/fix.html');
    await focusPreparedVehicle(page,'corolla-prepared-demo');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(artifacts,'fix-carousel-mobile.png'),fullPage:true});
    await page.getByRole('button',{name:'Select Toyota Corolla',exact:true}).focus(); await page.keyboard.press('Enter');
    await page.locator('#viewer-controls').waitFor({state:'visible',timeout:60000});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const stage=await page.locator('.stage').boundingBox(),chat=await page.locator('.conversation').boundingBox();
    assert.ok(chat.y>=stage.y+stage.height-2);
    await page.screenshot({path:path.join(artifacts,'fix-workspace-mobile.png'),fullPage:true});
  });
  await check('The 630px preview keeps the car left and conversation right without overflow', async () => {
    await page.setViewportSize({width:630,height:1000});
    await openDemo();
    const stage=await page.locator('.stage').boundingBox(),chat=await page.locator('.conversation').boundingBox();
    assert.ok(stage.x+stage.width<=chat.x+2 && Math.abs(stage.y-chat.y)<2);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(artifacts,'fix-workspace-preview630.png'),fullPage:true});
  });
  await page.close();page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await check('Real viewer preserves assembly endpoints and isolates the selected original surface', async () => {
    await page.goto(base+'/tests/viewer-harness.html');
    await page.waitForFunction(()=>Boolean(window.viewerHarness),null,{timeout:60000});
    assert.equal(await page.evaluate(()=>viewerHarness.snapshot().length),43);
    await page.evaluate(()=>viewerHarness.viewer.setExplode(0));await nextFrames();
    const assembled=await page.evaluate(()=>viewerHarness.snapshot());
    assert.ok(assembled.every(group=>group.position.every(value=>Math.abs(value)<1e-9)));
    await page.evaluate(()=>viewerHarness.viewer.setExplode(1));await nextFrames();
    const exploded=await page.evaluate(()=>({groups:viewerHarness.snapshot(),parts:viewerHarness.manifest.parts}));
    for(const group of exploded.groups) assert.deepEqual(group.position,exploded.parts.find(part=>part.id===group.id).offsetMeters);
    await page.evaluate(()=>{viewerHarness.viewer.select('left-front-fender');viewerHarness.viewer.isolate();});
    assert.equal(await page.evaluate(()=>lastSelectedPart),'left-front-fender');
    assert.deepEqual(await page.evaluate(()=>viewerHarness.snapshot().filter(group=>group.visible).map(group=>group.id)),['left-front-fender']);
    await page.evaluate(()=>viewerHarness.viewer.reset());
    assert.equal(await page.evaluate(()=>viewerHarness.snapshot().filter(group=>group.visible).length),43);
  });
  await check('Real targeted damage highlight pulses, respects reduced motion and restores original materials', async () => {
    await page.evaluate(()=>viewerHarness.viewer.setDamage(['left-front-fender','invalid-part']));await nextFrames();
    const highlighted=await page.evaluate(()=>viewerHarness.snapshot());
    const left=highlighted.find(group=>group.id==='left-front-fender');
    assert.ok(left.materials.some(material=>JSON.stringify(material.color)!==JSON.stringify(material.originalColor)));
    for(const group of highlighted.filter(group=>group.id!=='left-front-fender')) for(const material of group.materials) {assert.deepEqual(material.color,material.originalColor);assert.deepEqual(material.emissive,material.originalEmissive);}
    const staticValue=left.materials[0].intensity;await nextFrames(12);
    assert.equal(await page.evaluate(()=>viewerHarness.snapshot().find(group=>group.id==='left-front-fender').materials[0].intensity),staticValue);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForFunction(value=>Math.abs(viewerHarness.snapshot().find(group=>group.id==='left-front-fender').materials[0].intensity-value)>.015,staticValue);
    const animated=await page.evaluate(()=>viewerHarness.snapshot().find(group=>group.id==='left-front-fender').materials[0].intensity);
    await page.waitForFunction(value=>Math.abs(viewerHarness.snapshot().find(group=>group.id==='left-front-fender').materials[0].intensity-value)>.015,animated);
    await page.screenshot({path:path.join(artifacts,'fix-targeted-highlight.png')});
    await page.evaluate(()=>viewerHarness.viewer.setDamage([]));await nextFrames();
    const restored=await page.evaluate(()=>viewerHarness.snapshot());
    for(const group of restored)for(const material of group.materials){assert.deepEqual(material.color,material.originalColor);assert.deepEqual(material.emissive,material.originalEmissive);assert.equal(material.intensity,material.originalIntensity);}
  });
  await check('Mobile camera fits the entire explosion range and preserves the selected orbit', async () => {
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.setViewportSize({width:353,height:650});
    await page.evaluate(()=>{viewerHarness.viewer.setExplode(.5);viewerHarness.viewer.reset();viewerHarness.viewer.select('left-front-fender');});await nextFrames();
    const direction=await page.evaluate(()=>viewerHarness.viewer.camera.position.clone().sub(viewerHarness.viewer.controls.target).normalize().toArray());
    for(const amount of [0,.5,1]) {
    await page.evaluate(amount=>viewerHarness.viewer.setExplode(amount),amount);await nextFrames();
    const bounds = await page.evaluate(()=>{
      const viewer=viewerHarness.viewer,points=[];
      viewer.camera.updateMatrixWorld();
      for(const group of viewer.groups.values()) {const box=viewer.outline.box.clone().setFromObject(group);for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(viewer.model.position.clone().set(x,y,z).project(viewer.camera));}
      return {minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y))};
    });
    assert.ok(bounds.minX>=-1 && bounds.maxX<=1 && bounds.minY>=-1 && bounds.maxY<=1,`Projected bounds at ${amount}: ${JSON.stringify(bounds)} exceed the visible viewport`);
    }
    await page.setViewportSize({width:500,height:780});await nextFrames();
    const after=await page.evaluate(()=>({direction:viewerHarness.viewer.camera.position.clone().sub(viewerHarness.viewer.controls.target).normalize().toArray(),selected:viewerHarness.viewer.selected}));
    after.direction.forEach((value,index)=>assert.ok(Math.abs(value-direction[index])<1e-6));
    assert.equal(after.selected,'left-front-fender');
  });
  await check('No uncaught exceptions in the live Fix interface or real viewer',async()=>assert.deepEqual(errors,[]));
}finally{await writeFile(path.join(artifacts,'fix-results.json'),JSON.stringify({base,checks,failures,errors,skipped,limitation:'No successful external assistant analysis or generation was mocked or verified.'},null,2));await browser.close();}
if(failures.length)process.exitCode=1;
