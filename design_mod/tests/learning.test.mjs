import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lessons,chapters,labResult,lessonForPart,introPose} from '../src/learning-course.mjs';
test('Introduction completes a reversible explode/reassemble cycle',()=>{assert.equal(introPose(0).explode,0);assert.equal(introPose(5).explode,1);assert.equal(introPose(7).explode,1);assert.equal(introPose(10).explode,0);assert.equal(introPose(10).done,true);for(let t=0;t<=12;t+=.1){const p=introPose(t);assert.ok(p.explode>=0&&p.explode<=1);}});
test('Engineering labs preserve dimensional relationships',()=>{assert.equal(labResult('engine',6000).value,300);assert.equal(labResult('brakes',72).value,4*labResult('brakes',36).value);assert.equal(labResult('lights',10).value,25);assert.equal(labResult('cabin',100).value,2*labResult('cabin',200).value);assert.equal(labResult('glass',0).value,'0.0');assert.equal(labResult('wheels',0).value,0);});
test('Every module has four chapters and a valid knowledge check',()=>{assert.equal(lessons.length,7);assert.equal(new Set(lessons.map(l=>l.id)).size,7);for(const l of lessons){assert.equal(l.sections.length,chapters.length);assert.ok(l.answers[l.correct]);for(const s of l.sections)assert.equal(s.length,3);for(const v of [l.lab.min,l.lab.value,l.lab.max])assert.ok(Number.isFinite(Number(labResult(l.id,v).value)));}});
test('Source car parts route to the relevant system',()=>{for(const [part,id] of [['Left front tire','wheels'],['Right front brake','brakes'],['Windshield','glass'],['Rear lamps','lights'],['Cabin interior','cabin'],['Hood','body']])assert.equal(lessonForPart(part),id);});

import {courses,parseLearningRoute,progressKey,migrateProgress} from '../src/learning-models.mjs';
import {lessonsForCourse} from '../src/learning-course.mjs';
import {createSourceStudy,sourceParts,sourceStats} from '../src/learning-parts.mjs';
import {prepareVehicle,disposeObject} from '../vehicle-scene.mjs';
import {loadTestVehicle} from './load-test-vehicle.mjs';

test('All courses retain scoped deep links, distinct progress, and legacy Porsche progress',()=>{
 const keys=new Set();
 for(const course of courses){const r=parseLearningRoute(`#lesson/${course.slug}/wheels/2`);assert.equal(r.course.vehicleId,course.vehicleId);assert.equal(r.id,'wheels');assert.equal(r.section,'2');keys.add(progressKey(course,'wheels',0));assert.equal(lessonsForCourse(course).length,7);}
 assert.equal(keys.size,3);assert.equal(parseLearningRoute('#lesson/body/0').course.slug,'porsche');
 const migrated=migrateProgress({'wheels:0':true,'wheels:quiz':true});assert.equal(migrated['porsche:wheels:quiz'],true);assert.equal(migrated['toyota:wheels:0'],undefined);
});
test('Engine exercises use the selected cylinder count without substituting generic engine geometry',()=>{
 for(const c of courses){assert.equal(labResult('engine',6000,c.cylinders).value,c.cylinders*50);const engine=lessonsForCourse(c).find(l=>l.id==='engine');assert.equal(engine.name,c.engine);assert.ok(engine.sections[0][1].includes(c.engineSpec));assert.equal(c.engineAsset,null);}
});
test('Every rendered system preserves the selected car’s source geometry and accurate corner bounds',async()=>{
 for(const c of courses){const source=await loadTestVehicle(c.vehicle),model=prepareVehicle(source,c.vehicle);
  for(const id of ['wheels','brakes','body','glass','lights','cabin']){
   const groups=sourceParts(model,id),study=createSourceStudy(model,id);assert.ok(groups.length>0,`${c.slug}/${id} has source geometry`);assert.equal(study.children.length,groups.length);assert.ok(sourceStats(study).triangles>100);
   for(let i=0;i<groups.length;i++){const original=groups[i],copy=study.children[i];assert.equal(copy.name,original.name);assert.equal(copy.children.length,original.children.length);
    for(let j=0;j<original.children.length;j++){const a=original.children[j].geometry,b=copy.children[j].geometry;assert.notEqual(a,b);assert.deepEqual(b.index.array,a.index.array);for(const attr of Object.keys(a.attributes))assert.deepEqual(b.attributes[attr].array,a.attributes[attr].array);}
   }
   if(['wheels','brakes'].includes(id))assert.ok(groups.every(g=>g.name.startsWith('Left front')));
   disposeObject(study,{textures:false});
  }
  assert.equal(createSourceStudy(model,'engine').children.length,0);disposeObject(model.root);disposeObject(model.overlayRoot);disposeObject(source);
 }
});
