// Live browser checks; an iPhone user agent is not native camera or depth-hardware testing.
// References checked 2026-09-13:
// https://playwright.dev/docs/api/class-filechooser#file-chooser-set-files
// https://playwright.dev/docs/api/class-browser#browser-new-context
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.STUDIO_URL||'http://127.0.0.1:8788';
const artifacts=process.env.TEST_ARTIFACTS||path.join(os.tmpdir(),'car-parts-browser-results');
await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({headless:true});
const checks=[],errors=[],failures=[];
let analysisRequests=0;
const pass=message=>{checks.push(message);console.log('PASS '+message);};
async function openPartScanner(page){
  await page.goto(base+'/fix.html?vehicle=corolla-prepared-demo');
  await page.locator('#viewer-controls').waitFor({state:'visible',timeout:45000});
  await page.locator('#parts-list').evaluate(list=>{list.parentElement.open=true;});
  await page.locator('#parts-list .part-row[data-id="front-bumper"]').click();
  await page.locator('#scan-replacement').click();
  await page.locator('.scan-dialog').waitFor({state:'visible'});
}
try {
  for(const device of ['desktop','iphone']){
    const context=await browser.newContext({viewport:device==='desktop'?{width:1440,height:900}:{width:390,height:844},reducedMotion:'reduce',...(device==='iphone'?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',isMobile:true,hasTouch:true}:{})});
    const page=await context.newPage();page.setDefaultTimeout(15000);
    page.on('pageerror',error=>errors.push({device,error:error.message}));
    page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/repair/chat')analysisRequests++;});
    await openPartScanner(page);
    if(device==='desktop'){
      assert.equal(await page.locator('#scan-iphone').isVisible(),false);
      await page.locator('#scan-close').click();
      assert.equal(await page.locator('.scan-dialog').isVisible(),false);
      pass('Desktop hides the iPhone control; scanner opens and closes for the actual Corolla bumper');
    }else{
      assert.equal(await page.locator('#scan-iphone').isVisible(),true);
      assert.equal(await page.locator('#scan-iphone').innerText(),'Scan with iPhone');
      const chooserPromise=page.waitForEvent('filechooser');
      await page.locator('#scan-iphone').click();
      const chooser=await chooserPromise;
      assert.equal(await chooser.element().getAttribute('id'),'scan-camera');
      assert.equal(await chooser.element().getAttribute('capture'),'environment');
      assert.equal(chooser.isMultiple(),false);
      // Clearing the intercepted browser chooser represents no photo selected;
      // it does not claim to press Cancel in an actual iOS camera interface.
      await chooser.setFiles([]);
      assert.equal(await page.locator('#scan-photo').isVisible(),false);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.scan-dialog').isVisible(),false);
      pass('iPhone browser control opens the real scan-camera file chooser; empty selection and Escape leave the scanner closed');
      await page.locator('#scan-replacement').click();
      await page.locator('#scan-start').click();
      await page.locator('#scan-close').click();
      assert.equal(await page.locator('.scan-dialog').isVisible(),false);
      await page.locator('#scan-replacement').click();
      await page.locator('#scan-start').click();
      await page.waitForFunction(()=>document.getElementById('scan-status').textContent==='Replacement preview ready.',null,{timeout:20000});
      for(const id of ['scan-cad','scan-glb','scan-apply','scan-dimensions'])assert.equal(await page.locator('#'+id).isVisible(),true);
      assert.equal(await page.locator('#scan-model canvas').count(),1);
      assert.equal(await page.locator('#scan-start').isVisible(),false);
      await page.locator('#scan-close').click();
      assert.equal(await page.locator('.scan-dialog').isVisible(),false);
      pass('Closing an active sample scan cancels it; reopening completes the actual sample reconstruction and exposes all result controls');
    }
    await context.close();
  }
  assert.equal(analysisRequests,0);assert.deepEqual(errors,[]);
  pass('No browser exceptions or network analysis requests');
}catch(error){failures.push(error.stack||error.message);console.error('FAIL '+(error.stack||error.message));process.exitCode=1;}
finally{await writeFile(path.join(artifacts,'iphone-scan-results.json'),JSON.stringify({checks,errors,failures,analysisRequests,limitations:['Chromium with an iPhone user agent; native iOS app, Swift bridge, phone camera, and depth hardware were not exercised.']},null,2));await browser.close();}
