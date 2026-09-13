// Bounded live regression for removal of helper labels. Real models and photo decoding; no external requests.
// References: https://playwright.dev/docs/api/class-locator#locator-set-input-files
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {focusPreparedVehicle} from './browser_support.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.STUDIO_URL||'http://127.0.0.1:8788',artifacts=process.env.TEST_ARTIFACTS||path.join(os.tmpdir(),'car-parts-browser-results');
await mkdir(artifacts,{recursive:true});
const bytes=await readFile(new URL('../design_mod/public/assets/ferrari_ao.png',import.meta.url));
const browser=await chromium.launch({headless:true}),context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();
const errors=[],checks=[],failures=[];let posts=0;
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/repair/chat')posts++;});
try{
  await page.goto(base+'/fix.html');
  await focusPreparedVehicle(page,'corolla-prepared-demo');
  const catalog=await(await page.request.get(base+'/api/repair/catalog')).json();
  assert.equal(catalog.vehicles.filter(vehicle=>vehicle.prepared).length,2);
  assert.equal(catalog.vehicles.filter(vehicle=>!vehicle.prepared).length,4);
  for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]]){
    await page.setViewportSize({width,height});
    assert.equal(await page.locator('#car-picker canvas').count(),1);
    assert.equal(await page.locator('#car-picker img,#car-picker article').count(),0);
    assert.equal(await page.locator('#showroom-name').innerText(),'Toyota Corolla · 2020');
    assert.equal(await page.locator('#showroom-previous').isDisabled(),false);
    assert.equal(await page.locator('#showroom-next').isDisabled(),true);
    assert.equal(await page.locator('#showroom-meta,#vehicle-meta,#asset-status,#credits,#photo-note,#connection-status,#selection-help,footer,.header-link,.scope-note,.red-key').count(),0);
    assert.doesNotMatch(await page.locator('body').innerText(),/source credits|unverified|local demonstration/i);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1));
    if(process.env.CLEANUP_SCREENSHOTS==='1')await page.screenshot({path:path.join(artifacts,`fix-cleanup-showroom-${name}.png`),fullPage:true});
    await page.locator('#vehicle-list').focus();await page.keyboard.press('Enter');
    await page.locator('#viewer-controls').waitFor({state:'visible',timeout:60000});
    assert.equal(await page.locator('#vehicle-title').innerText(),'Toyota Corolla · 2020');
    assert.equal(await page.locator('#explode').inputValue(),'50');
    assert.match(await page.locator('#confirm-repair').innerText(),/CAD concepts/);
    assert.doesNotMatch(await page.locator('body').innerText(),/source credits|unverified|local demonstration/i);
    await page.locator('#damage-photos').setInputFiles({name:'local-test.png',mimeType:'image/png',buffer:bytes});
    await page.waitForFunction(()=>document.querySelectorAll('#photos .photo').length===1);
    assert.equal(await page.locator('#send-message').isEnabled(),true);
    await page.getByRole('button',{name:'Remove photo local-test.png',exact:true}).click();
    assert.equal(await page.locator('#photos .photo').count(),0);
    assert.equal(await page.locator('#send-message').isDisabled(),true);
    if(process.env.CLEANUP_SCREENSHOTS==='1')await page.screenshot({path:path.join(artifacts,`fix-cleanup-workspace-${name}.png`),fullPage:true});
    await page.locator('#change-car').click();
    assert.equal(await page.locator('#car-picker').isVisible(),true);
    assert.equal(await page.locator('#car-picker canvas').count(),1);
    assert.equal(await page.evaluate(()=>document.body.classList.contains('showroom-open')&&scrollY===0),true);
    checks.push(`${name}: current full title, removed labels absent, one actual canvas, Enter opens 50%, photos attach/remove, return restores showroom`);console.log('PASS '+checks.at(-1));
  }
  assert.equal(posts,0);assert.deepEqual(errors,[]);
  checks.push('Two prepared cars and four pending sources; no external damage requests or browser exceptions');console.log('PASS '+checks.at(-1));
}catch(error){failures.push(error.message);console.error('FAIL '+error.message);console.error('Visible page: '+await page.locator('body').innerText().catch(()=>'(unavailable)'));process.exitCode=1;}
finally{await writeFile(path.join(artifacts,'cleanup-results.json'),JSON.stringify({base,checks,failures,errors,externalDamageRequests:posts},null,2));await browser.close();}
