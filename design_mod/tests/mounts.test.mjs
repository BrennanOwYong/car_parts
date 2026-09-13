import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {vehicles,regions,styles} from '../catalog.mjs';
import {createPartGroup,individualParts,disposeGroup} from '../geometry.mjs';
import {buildExport} from '../server.mjs';
import {createFastener,explodeFastener} from '../hardware.mjs';

test('Every modeled hole is clear, has surrounding solid, and stays circular across cars',()=>{
  const ray=new THREE.Raycaster();
  for(const v of vehicles)for(const region of regions)for(const style of styles){
    const group=createPartGroup(region.id,style.id,undefined,v.id);group.updateMatrixWorld(true);
    for(const part of group.children){
      assert.equal(part.userData.mountPoints.length,4);
      for(const mount of part.userData.mountPoints){
        const [x,y,z]=mount.position;
        for(const [dx,dz,solid] of [[0,0,false],[.0031,0,false],[0,.0031,false],[.004,0,true],[0,.004,true]]){
          ray.set(new THREE.Vector3(x+dx,y+.4,z+dz),new THREE.Vector3(0,-1,0));
          assert.equal(ray.intersectObject(part).length>0,solid,`${v.id}/${region.id}/${style.id}: hole clearance at ${dx},${dz}`);
        }
      }
    }
    disposeGroup(group);
  }
});
test('Export hole coordinates remain in each STL part frame',()=>{
  for(const v of vehicles)for(const region of regions){
    for(const part of individualParts(region.id,'sport',v.id)){
      const box=part.geometry.boundingBox;
      for(const hole of part.userData.mountPoints){
        assert.equal(hole.clearanceDiameterMm,6.6);
        assert.equal(hole.position,undefined);
        assert.ok(box.clone().expandByScalar(.02).containsPoint(new THREE.Vector3(...hole.positionMm)));
      }
      part.geometry.dispose();part.material.dispose();
    }
  }
});
test('Fastener separation is reversible and remains illustrative',()=>{
  const group=createFastener({position:[0,0,0],thicknessMm:8}),rest=group.children.map(o=>o.position.y);
  explodeFastener(group,1);assert.ok(group.children.some((o,i)=>o.position.y!==rest[i]));
  explodeFastener(group,0);assert.deepEqual(group.children.map(o=>o.position.y),rest);
  group.traverse(o=>{if(o.geometry)for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));});
  disposeGroup(group);
});
test('Full kit guide and BOM match selected parts and cannot claim verified installation',()=>{
  const result=buildExport({vehicleId:vehicles[0].id,selections:{front:'sport',sides:'subtle',rear:'aggressive'}});
  const guide=new TextDecoder().decode(result.files['assembly-guide.html']);
  assert.equal((guide.match(/<section class="page">/g)||[]).length,7);
  assert.equal(result.manifest.hardware.find(h=>h.id==='H1').quantity,16);
  assert.equal(result.manifest.hardware.find(h=>h.id==='H2').quantity,32);
  assert.equal(result.manifest.mountingConcept.vehiclePatternVerified,false);
  assert.match(guide,/Do not drill/);assert.match(guide,/VEHICLE INSTALLATION: ON HOLD/);
  assert.ok(!guide.includes('<script'));
  for(const part of result.manifest.parts)assert.ok(guide.includes(part.name));
});

test('Manual uses monochrome diagrams, actual hardware counts and illustrated steps',()=>{
  const result=buildExport({vehicleId:vehicles[0].id,selections:{rear:'sport'}});
  const guide=new TextDecoder().decode(result.files['assembly-guide.html']);
  assert.equal((guide.match(/class="hardware-item"/g)||[]).length,5);
  assert.equal((guide.match(/class="step-heading"/g)||[]).length,6);
  assert.match(guide,/<b>H1<\/b><span>4×<\/span>/);
  assert.match(guide,/<b>H2<\/b><span>8×<\/span>/);
  assert.match(guide,/circular hole close-up/);
  assert.match(guide,/hand-start/);
  assert.ok(!guide.includes('step-icon'));
  const drawings=guide.match(/<svg[\s\S]*?<\/svg>/g);
  assert.ok(drawings.length>=14);
  for(const drawing of drawings){
    assert.ok(!/undefined|NaN|Infinity/.test(drawing));
    for(const [,color] of drawing.matchAll(/(?:stroke|fill)="([^"]+)"/g))assert.ok(['#111','#fff','none'].includes(color),color);
  }
});
