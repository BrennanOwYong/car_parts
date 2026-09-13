// Live showroom regression checks; actual prepared vehicle and server, no replaced responses.
// References: https://playwright.dev/docs/api/class-page and https://playwright.dev/docs/api/class-mouse
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {focusPreparedVehicle} from './browser_support.mjs';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.STUDIO_URL || 'http://127.0.0.1:8788';
const artifacts = process.env.TEST_ARTIFACTS || path.join(os.tmpdir(), 'car-parts-browser-results');
await mkdir(artifacts, {recursive:true});
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({reducedMotion:'reduce'});
await context.addInitScript(() => {
  window.__showroomDraws = new WeakMap();
  for (const constructor of [WebGLRenderingContext, WebGL2RenderingContext]) {
    const original=constructor.prototype.drawElements;
    constructor.prototype.drawElements=function(...args){window.__showroomDraws.set(this.canvas,(window.__showroomDraws.get(this.canvas)||0)+1);return original.apply(this,args);};
  }
});
const page = await context.newPage(), errors=[], checks=[], failures=[];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {if(/NaN|matrix.*invert|GL_INVALID/i.test(message.text()))errors.push(message.text());});
let posts=0;
page.on('request', request => {if(request.method()==='POST' && new URL(request.url()).pathname==='/api/repair/chat')posts++;});
async function frames() {await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function assertLocked() {
  const bounds=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,scrollY,bodyClass:document.body.classList.contains('showroom-open')}));
  assert.equal(bounds.bodyClass,true);
  assert.ok(bounds.scrollWidth<=bounds.width+1 && bounds.scrollHeight<=bounds.height+1,JSON.stringify(bounds));
  assert.equal(bounds.scrollY,0);
  await page.mouse.move(10,Math.min(bounds.height-10,150));
  await page.mouse.wheel(0,1300);await frames();
  assert.equal(await page.evaluate(()=>scrollY),0,'Wheel outside the carousel cannot scroll the page vertically');
  await page.locator('#vehicle-list canvas').hover();await page.mouse.wheel(0,1300);await frames();
  assert.equal(await page.evaluate(()=>scrollY),0,'Wheel over the car cannot scroll the page vertically');
}
try {
  await page.goto(base+'/fix.html');
  await focusPreparedVehicle(page,'corolla-prepared-demo');
  const catalog=await (await page.request.get(base+'/api/repair/catalog')).json();
  assert.equal(catalog.vehicles.filter(v=>v.prepared).length,2,'The real Ferrari and Corolla are available');
  for(const [name,width,height] of [['desktop',1440,900],['preview630',630,680],['mobile',390,844],['landscape',844,390]]) {
    try {
      await page.setViewportSize({width,height});await frames();
      assert.equal(await page.locator('#car-picker canvas').count(),1);
      assert.equal(await page.locator('#car-picker img,#car-picker article,.showroom-car,.vehicle-card,.car-visual,.car-carousel').count(),0);
      const originalCanvas=await page.locator('#vehicle-list canvas').elementHandle();
      assert.equal(await page.locator('#car-picker h1,#ready-count,#pending-models,#pending-list,.showroom-intro,.showroom-footer').count(),0);
      assert.equal(await page.locator('footer').isVisible(),false);
      assert.equal(await page.locator('.header-link').isVisible(),false);
      assert.equal(await page.locator('#showroom-meta,#vehicle-meta,#asset-status,#credits,#photo-note').count(),0);
      assert.equal((await page.locator('.car-name h2').innerText()).trim(),'Toyota Corolla · 2020');
      assert.equal(await page.locator('#car-picker button').count(),2);
      assert.equal(await page.getByRole('button',{name:'Previous car',exact:true}).isDisabled(),false);
      assert.equal(await page.getByRole('button',{name:'Next car',exact:true}).isDisabled(),true);
      const car=await page.locator('#vehicle-list canvas').boundingBox(),label=await page.locator('.car-name').boundingBox();
      assert.ok(car.y>=0 && car.y+car.height<=height+1 && label.y+label.height<=height+1,'Car and model name fit inside the viewport');
      await assertLocked();
      await page.mouse.move(car.x+car.width*.5,car.y+car.height*.5);await page.mouse.down();await page.mouse.move(car.x+car.width*.7,car.y+car.height*.5,{steps:6});await page.mouse.up();await frames();
      assert.equal(await page.locator('#repair-workspace').isVisible(),false,'Dragging does not select the car');
      await page.screenshot({path:path.join(artifacts,`fix-showroom-${name}.png`),fullPage:true});
      if(name==='desktop'||name==='landscape')await page.locator('#vehicle-list canvas').click();
      else {await page.getByRole('button',{name:'Select Toyota Corolla',exact:true}).focus();await page.keyboard.press('Enter');}
      await page.locator('#viewer-controls').waitFor({state:'visible',timeout:60000});await frames();
      assert.equal(await page.locator('#explode').inputValue(),'50');
      assert.equal(await page.locator('#assembly-state').innerText(),'Separated 50%');
      assert.equal(await page.locator('#viewport canvas').count(),1);
      assert.equal(await page.evaluate(()=>document.body.classList.contains('showroom-open')),false);
      assert.equal(await page.evaluate(()=>scrollY),0);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if(name!=='landscape')await page.screenshot({path:path.join(artifacts,`fix-workspace-${name}.png`),fullPage:true});
      await page.locator('#change-car').click();await frames();
      assert.equal(await page.locator('#car-picker').isVisible(),true);
      assert.equal(await originalCanvas.evaluate(canvas=>canvas===document.querySelector('#vehicle-list canvas')),true,'The original shared renderer is restored');
      const draws=await originalCanvas.evaluate(canvas=>window.__showroomDraws.get(canvas)||0);
      await page.setViewportSize({width:width+1,height});
      await page.waitForFunction(before=>(window.__showroomDraws.get(document.querySelector('#vehicle-list canvas'))||0)>before,draws,{timeout:5000});
      await page.setViewportSize({width,height});
      await assertLocked();
      checks.push(`${name} ${width}×${height}: one live canvas, zero images/cards/vertical scrolling, drag does not select, car enters at 50%, All cars restores rendering`);
      console.log('PASS '+checks.at(-1));
    }catch(error){failures.push({name,error:error.message});console.error(`FAIL ${name}: ${error.message}`);await page.screenshot({path:path.join(artifacts,`showroom-failure-${name}.png`),fullPage:true});await page.goto(base+'/fix.html');await focusPreparedVehicle(page,'corolla-prepared-demo');}
  }
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(base+'/fix.html');
  await focusPreparedVehicle(page,'corolla-prepared-demo');
  const animatedCanvas=await page.locator('#vehicle-list canvas').elementHandle();
  await page.locator('#vehicle-list canvas').click();
  await page.waitForFunction(()=>document.querySelector('body>canvas.car-entrance'));
  assert.equal(await animatedCanvas.evaluate(canvas=>canvas===document.querySelector('body>canvas.car-entrance')),true,'Entrance uses the actual renderer canvas');
  assert.equal(await page.locator('img.car-entrance').count(),0);
  await page.waitForFunction(()=>!document.body.classList.contains('repair-entering') && !document.querySelector('body>canvas.car-entrance'),null,{timeout:60000});
  await page.locator('#change-car').click();
  await page.waitForFunction(()=>document.querySelector('#vehicle-list canvas')?.getBoundingClientRect().width>0);
  assert.equal(await animatedCanvas.evaluate(canvas=>getComputedStyle(canvas).opacity),'1');
  const animatedDraws=await animatedCanvas.evaluate(canvas=>window.__showroomDraws.get(canvas)||0);
  await page.setViewportSize({width:845,height:390});
  await page.waitForFunction(before=>(window.__showroomDraws.get(document.querySelector('#vehicle-list canvas'))||0)>before,animatedDraws,{timeout:5000});
  checks.push('Animated entrance moves the actual canvas and restores a visible live renderer');console.log('PASS '+checks.at(-1));
  await page.goto(base+'/tests/showroom-harness.html');
  await page.waitForFunction(()=>window.showroomHarness?.entries.length===2,null,{timeout:60000});
  const geometry=await page.evaluate(()=>{
    const world=showroomHarness;world.pan(999);world.move(-1);world.resize();
    const corolla=world.entries.find(entry=>entry.vehicle.id==='corolla-prepared-demo');
    let triangles=0;corolla.model.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
    return {entries:world.entries.length,id:corolla.vehicle.id,triangles,destination:world.destination,position:world.position,finite:[...world.camera.matrixWorld.elements,...world.camera.projectionMatrix.elements,...corolla.model.matrixWorld.elements,world.lookY,world.visibleWidth].every(Number.isFinite)};
  });
  assert.deepEqual(geometry,{entries:2,id:'corolla-prepared-demo',triangles:205990,destination:0,position:0,finite:true});
  checks.push('Actual shared world retains the original Corolla triangles alongside Ferrari with finite transforms and bounded navigation');console.log('PASS '+checks.at(-1));
  assert.equal(posts,0,'Local showroom checks never call the external damage service');
  assert.deepEqual(errors,[]);
  const status=await (await page.request.get(base+'/api/repair/status')).json();
  checks.push(`No browser exceptions or damage requests; service configured: ${status.configured===true}`);
  console.log('PASS '+checks.at(-1));
}finally{await writeFile(path.join(artifacts,'showroom-results.json'),JSON.stringify({base,checks,failures,errors,limitation:'Ferrari and Corolla are actual installed assets; four requested external sources remain pending.'},null,2));await browser.close();}
if(failures.length)process.exitCode=1;
