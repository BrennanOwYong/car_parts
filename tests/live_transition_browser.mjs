// Actual showroom/repair transition; instrumentation observes original methods and never replaces model data.
// References: https://playwright.dev/docs/api/class-page#page-evaluate
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {focusPreparedVehicle} from './browser_support.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.STUDIO_URL||'http://127.0.0.1:8788',artifacts=path.join(os.tmpdir(),'car-parts-browser-results');await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
const checks=[],errors=[],failures=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(base+'/fix.html');await focusPreparedVehicle(page,'corolla-prepared-demo');
 await page.evaluate(async()=>{
  const moduleUrl=performance.getEntriesByType('resource').find(entry=>new URL(entry.name).pathname==='/src/fix-viewer.js')?.name;
  if(!moduleUrl)throw new Error('The live viewer module request was not recorded');
  const {Showroom,RepairViewer}=await import(moduleUrl);
  window.__wheelSteps=[];window.__transition=[];
  const move=Showroom.prototype.move;Showroom.prototype.move=function(delta){window.__world=this;window.__wheelSteps.push(delta);return move.call(this,delta);};
  const explode=RepairViewer.prototype.setExplode;RepairViewer.prototype.setExplode=function(value){window.__repair=this;return explode.call(this,value);};
  const begin=Showroom.prototype.startRepair;Showroom.prototype.startRepair=function(id){
   window.__world=this;const canvas=this.renderer.domElement,before=canvas.getBoundingClientRect();window.__initialCenter=before.x+before.width/2;
   const result=begin.call(this,id),started=performance.now();
   const sample=()=>{const rect=canvas.getBoundingClientRect(),target=document.getElementById('viewport').getBoundingClientRect();window.__transition.push({center:rect.x+rect.width/2,target:target.x+target.width/2,separation:this.separation,nonzero:[...this.repairEntry.groups.values()].some(g=>g.position.lengthSq()>1e-8),entering:canvas.classList.contains('car-entrance')});if(performance.now()-started<4000&&canvas.classList.contains('car-entrance'))requestAnimationFrame(sample);};requestAnimationFrame(sample);return result;
  };
  const burst=delta=>{for(let i=0;i<12;i++)document.getElementById('vehicle-list').dispatchEvent(new WheelEvent('wheel',{deltaY:delta,bubbles:true,cancelable:true}));};
  burst(90);window.__wheelBurst=burst;
 });
 assert.deepEqual(await page.evaluate(()=>__wheelSteps),[1]);
 await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,230)));
 await page.evaluate(()=>__wheelBurst(-90));assert.deepEqual(await page.evaluate(()=>__wheelSteps),[1,-1]);
 assert.equal(await page.evaluate(()=>__world.entries.length),2);assert.equal(await page.evaluate(()=>__world.destination),0);
 checks.push('Real wheel handler makes one signed step per burst and rearms after the 180ms quiet period using the two installed cars');console.log('PASS '+checks.at(-1));
 await focusPreparedVehicle(page,'corolla-prepared-demo');
 await page.locator('#vehicle-list').focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>window.__repair?.model&&Math.abs(__repair.amount-.5)<.003&&!document.body.classList.contains('repair-entering'),null,{timeout:60000});
 const motion=await page.evaluate(()=>({overlap:__transition.some(s=>s.entering&&s.nonzero&&s.separation>0&&s.center<__initialCenter-2&&s.center>s.target+2),startedBeforeArrival:__transition.some(s=>s.entering&&s.nonzero&&s.separation>0&&s.center>s.target+2),samples:__transition}));
 const final=await page.evaluate(()=>({target:__repair.target,amount:__repair.amount,finite:[...__repair.groups.values()].every(g=>g.position.toArray().every(Number.isFinite)),parts:__repair.groups.size}));
 assert.equal(final.target,.5);assert.ok(Math.abs(final.amount-.5)<.003);assert.equal(final.finite,true);assert.equal(final.parts,43);assert.equal(await page.locator('#explode').inputValue(),'50');
 await page.locator('#change-car').click();
 const assembled=await page.evaluate(()=>({active:__world.active,repair:__world.repairEntry,separation:__world.separation,zero:__world.entries.every(e=>e.model.visible&&[...e.groups.values()].every(g=>g.position.lengthSq()<1e-12)),canvases:document.querySelectorAll('#vehicle-list canvas').length}));
 assert.deepEqual(assembled,{active:true,repair:null,separation:0,zero:true,canvases:1});assert.deepEqual(errors,[]);
 checks.push('Repair settles at 50% with 43 finite assemblies, and return resets the real showroom geometry to assembled with no browser exceptions');console.log('PASS '+checks.at(-1));
 assert.ok(motion.startedBeforeArrival,'Real mapped offsets must start separating before the live canvas reaches its left target');
 checks.push(motion.overlap?'Actual mapped assembly offsets are nonzero in a sampled frame during leftward canvas motion':'Offsets are nonzero before the canvas reaches its left target; no intermediate moving frame was sampled');console.log('PASS '+checks.at(-1));
 console.log('MOTION '+JSON.stringify(motion));
}catch(error){failures.push(error.message);console.error('FAIL '+error.message);console.error(JSON.stringify(await page.evaluate(()=>({title:document.getElementById('showroom-name')?.textContent,error:document.getElementById('error')?.textContent,samples:window.__transition})).catch(()=>({}))));process.exitCode=1;}
finally{await writeFile(path.join(artifacts,'transition-results.json'),JSON.stringify({checks,errors,failures},null,2));await browser.close();}
