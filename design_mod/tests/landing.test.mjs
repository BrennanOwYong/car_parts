import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {landingMotion} from '../src/landing-motion.mjs';

test('Scroll timeline holds the full explosion before revealing modes and reverses to assembly',()=>{
  assert.equal(landingMotion(0).explode,0);
  assert.equal(landingMotion(0).opening,1);
  assert.equal(landingMotion(.68).explode,1);
  assert.equal(landingMotion(.68).reveal,0);
  assert.equal(landingMotion(1).reveal,1);
  assert.equal(landingMotion(1).blur,1);
  const forward=Array.from({length:101},(_,i)=>landingMotion(i/100));
  for(let i=1;i<forward.length;i++){
    assert.ok(forward[i].explode>=forward[i-1].explode);
    assert.ok(forward[i].reveal>=forward[i-1].reveal);
  }
  for(let i=100;i>=0;i--)assert.deepEqual(landingMotion(i/100),forward[i]);
});
test('Reduced motion removes camera travel and explosion but keeps modes reachable',()=>{
  for(const p of [0,.3,.6,1]){assert.equal(landingMotion(p,true).explode,0);assert.equal(landingMotion(p,true).turn,0);}
  assert.equal(landingMotion(1,true).reveal,1);
});
test('Landing asset provides a usable animation for every named assembly',async()=>{
  const bytes=await readFile(new URL('../public/assets/corolla-exploded.glb',import.meta.url));
  const length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+length));
  const animation=doc.animations.find(a=>a.name==='Assemble to Explode');
  assert.ok(animation);assert.equal(animation.channels.length,43);
  for(const channel of animation.channels){assert.ok(doc.nodes[channel.target.node].name);assert.equal(channel.target.path,'translation');}
});
