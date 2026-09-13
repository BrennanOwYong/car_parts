// Real Chromium clipboard + keyboard image/text paste against the live application.
// The files-only fallback is explicitly synthetic and reported separately.
// Official references checked 2026-09-13:
// https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write
// https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions
import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.STUDIO_URL||'http://127.0.0.1:8788',artifacts=path.join(os.tmpdir(),'car-parts-browser-results');await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({headless:true}),context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],reducedMotion:'reduce'}),page=await context.newPage();
const checks=[],errors=[],failures=[];let posts=0,savedClipboard=false;
page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/repair/chat')posts++;});
try{
 await page.goto(base+'/fix.html?vehicle=corolla-prepared-demo');await page.locator('#viewer-controls').waitFor({state:'visible',timeout:30000});
 await page.locator('#message-input').click();
 await page.evaluate(async()=>{
  const previous=await navigator.clipboard.read();window.__savedClipboard=await Promise.all(previous.filter(item=>item.types.length).map(async item=>{const data={};for(const type of item.types)data[type]=await item.getType(type);return new ClipboardItem(data);}));
  window.__pasteEvents=[];document.addEventListener('paste',event=>{window.__pasteEvents.push({trusted:event.isTrusted,types:[...(event.clipboardData?.items||[])].map(item=>item.type)});},true);
 });savedClipboard=true;
 const draft='Existing draft about the front fender.';await page.locator('#message-input').fill(draft);
 assert.match(await page.locator('#message-input').getAttribute('placeholder'),/Ctrl\+V/);
 await page.evaluate(async()=>{window.__pasteImage=await(await fetch('/assets/ferrari_ao.png')).blob();await navigator.clipboard.write([new ClipboardItem({'image/png':window.__pasteImage})]);});
 await page.keyboard.press('Control+V');
 await page.waitForFunction(()=>document.querySelectorAll('#photos .photo').length===1&&!document.getElementById('message-input').disabled);
 assert.equal(await page.locator('#photos .photo').count(),1);assert.equal(await page.locator('#message-input').inputValue(),draft);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'message-input');
 assert.equal(await page.locator('#send-message').isEnabled(),true);
 const imageEvent=await page.evaluate(()=>__pasteEvents[0]);assert.equal(imageEvent.trusted,true);assert.ok(imageEvent.types.includes('image/png'));
 await page.locator('#photos .photo button').click();assert.equal(await page.locator('#photos .photo').count(),0);assert.equal(await page.locator('#message-input').inputValue(),draft);
 checks.push('Real clipboard image + keyboard Ctrl+V emits a trusted paste event, creates exactly one removable preview, preserves the draft and focuses the composer');console.log('PASS '+checks.at(-1));
 await page.evaluate(()=>navigator.clipboard.writeText(' More detail.'));await page.locator('#message-input').focus();await page.keyboard.press('Control+End');await page.keyboard.press('Control+V');
 assert.equal(await page.locator('#message-input').inputValue(),draft+' More detail.');assert.equal(await page.locator('#photos .photo').count(),0);
 assert.equal(await page.evaluate(()=>__pasteEvents.at(-1).trusted),true);
 checks.push('Real clipboard text + keyboard Ctrl+V inserts ordinary text without creating a photo');console.log('PASS '+checks.at(-1));
 await page.evaluate(()=>{
  const paste=()=>{const event=new Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(event,'clipboardData',{value:{items:[],files:[new File([__pasteImage],'fallback.png',{type:'image/png'})]}});document.dispatchEvent(event);};paste();paste();
 });
 await page.waitForFunction(()=>document.querySelectorAll('#photos .photo').length===1&&!document.getElementById('message-input').disabled);
 assert.equal(await page.locator('#photos .photo').count(),1);assert.match(await page.locator('#chat-error').innerText(),/Wait for the current step/);
 assert.equal(await page.locator('#message-input').inputValue(),draft+' More detail.');assert.equal(await page.evaluate(()=>document.activeElement.id),'message-input');
 await page.locator('#photos .photo button').click();assert.equal(await page.locator('#photos .photo').count(),0);
 assert.equal(posts,0);assert.deepEqual(errors,[]);
 checks.push('Synthetic files-only fallback attaches once, concurrent preparation reports the busy error, and all paste/remove actions send zero damage requests');console.log('PASS '+checks.at(-1));
}catch(error){failures.push(error.message);console.error('FAIL '+error.message);console.error(JSON.stringify(await page.evaluate(()=>({title:document.getElementById('showroom-name')?.textContent,error:document.getElementById('error')?.textContent,chatError:document.getElementById('chat-error')?.textContent})).catch(()=>({}))));process.exitCode=1;}
finally{
 if(savedClipboard)try{await page.evaluate(async()=>{if(__savedClipboard.length)await navigator.clipboard.write(__savedClipboard);else await navigator.clipboard.writeText('');});}catch(error){failures.push('Clipboard restore failed: '+error.message);process.exitCode=1;}
 await writeFile(path.join(artifacts,'clipboard-results.json'),JSON.stringify({checks,errors,failures,damageRequests:posts,scope:'Real Chromium clipboard and keyboard; files-only fallback uses synthetic events. No external Astra request.'},null,2));await browser.close();
}
