// Reuse inspected source geometry. Official NodeIO/Node/Accessor references:
// https://gltf-transform.dev/modules/core/classes/NodeIO
// https://gltf-transform.dev/modules/core/classes/Node
// https://gltf-transform.dev/modules/core/classes/Accessor
import {readFile, writeFile} from 'node:fs/promises';
import {Matrix4, Vector3} from 'three';
import {fileURLToPath} from 'node:url';
import {inspectSource} from './prepare-vehicle.mjs';

const folder = new URL('../public/repair-assets/corolla-prepared-demo/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', folder), 'utf8'));
const {doc} = await inspectSource(fileURLToPath(new URL('vehicle.glb', folder)));
const entries = [];
const families = new Map();
for (const part of manifest.parts.filter(p=>p.family)) {
  const id = `${part.family}-${part.side || 'center'}`;
  if (!families.has(id)) families.set(id, []);
  families.get(id).push(part);
}
for (const [id, parts] of families) {
  const points=[], faces=[];
  for (const part of parts) {
    const group=doc.getRoot().listNodes().find(n=>n.getExtras().repairPartId===part.id);
    group.traverse(node=>{
      if(!node.getMesh())return;
      const transform=new Matrix4().fromArray(node.getWorldMatrix());
      for(const primitive of node.getMesh().listPrimitives()) {
        const positions=primitive.getAttribute('POSITION'), offset=points.length;
        const value=[], point=new Vector3();
        for(let i=0;i<positions.getCount();i++) {
          positions.getElement(i,value); point.fromArray(value).applyMatrix4(transform).multiplyScalar(1000);
          points.push(point.toArray().map(v=>Number(v.toFixed(3))));
        }
        const indices=primitive.getIndices()?.getArray() || Uint32Array.from({length:positions.getCount()},(_,i)=>i);
        for(let i=0;i<indices.length;i+=3)faces.push([offset+indices[i],offset+indices[i+1],offset+indices[i+2]]);
      }
    });
  }
  const header='// ROUGH VISUAL CONCEPT - NOT FOR FABRICATION\n// Saved Corolla 2020 visual surface, version 1. Not a watertight manufacturing solid.\n// Source model dimensions are estimates. OEM mounting coordinates UNVERIFIED. No screw holes generated.\n';
  const geometry=`polyhedron(points=${JSON.stringify(points)}, faces=${JSON.stringify(faces)}, convexity=10);\n`;
  const fitted=header+geometry;
  const offset=parts[0].offsetMeters.map(v=>v*500);
  const exploded=header+`translate(${JSON.stringify(offset)})\n`+geometry;
  const axes=[0,1,2].sort((a,b)=>(Math.max(...points.map(p=>p[b]))-Math.min(...points.map(p=>p[b])))-(Math.max(...points.map(p=>p[a]))-Math.min(...points.map(p=>p[a])))).slice(0,2);
  const mins=axes.map(a=>Math.min(...points.map(p=>p[a]))), maxs=axes.map(a=>Math.max(...points.map(p=>p[a])));
  const scale=Math.min(700/(maxs[0]-mins[0]||1),340/(maxs[1]-mins[1]||1));
  const project=p=>[50+(p[axes[0]]-mins[0])*scale,430-(p[axes[1]]-mins[1])*scale].map(v=>v.toFixed(1)).join(',');
  const label=`${parts[0].family.replaceAll('_',' ')} — ${parts[0].side || 'center'}`;
  const diagram=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 530"><rect width="800" height="530" fill="#0f141a"/><g fill="#b9c8d8">${faces.map(f=>`<polygon points="${f.map(i=>project(points[i])).join(' ')}"/>`).join('')}</g><g fill="white" font-family="Arial" font-size="20"><text x="32" y="35">Corolla 2020 · ${label}</text><text x="32" y="490" font-size="16">FORMA · Part reference</text></g></svg>`;
  entries.push({id,partType:parts[0].family,side:parts[0].side||'center',partName:label,assemblyIds:parts.map(p=>p.id),cadPayload:fitted,explodedCadPayload:exploded,diagramSvg:diagram,templateVersion:1,mountingStatus:'unverified',mountingHoles:[],sourceHash:manifest.outputHash});
}
await writeFile(new URL('repair-library.json', folder),JSON.stringify({version:1,vehicleAssetId:manifest.vehicleId,assumedYear:2020,sourceHash:manifest.outputHash,parts:entries}));
console.log(`Saved ${entries.length} reusable visual parts; no mounting holes inferred.`);
