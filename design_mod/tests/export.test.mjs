import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {unzipSync} from 'fflate';
import {buildExport,api} from '../server.mjs';
import {styles,regions,vehicle,vehicles} from '../catalog.mjs';
import {assertCatalog} from '../catalog-contract.mjs';

function inspectSTL(bytes){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),count=view.getUint32(80,true);
  assert.equal(bytes.length,84+50*count);assert.ok(count>10);
  const edges=new Map(),mins=[Infinity,Infinity,Infinity],maxs=[-Infinity,-Infinity,-Infinity];let volume=0;
  for(let i=0;i<count;i++){
    const vs=[];
    for(let v=0;v<3;v++){
      const p=[];for(let a=0;a<3;a++){const n=view.getFloat32(84+i*50+12+v*12+a*4,true);assert.ok(Number.isFinite(n));p.push(n);mins[a]=Math.min(mins[a],n);maxs[a]=Math.max(maxs[a],n);}vs.push(p);
    }
    const keys=vs.map(p=>p.map(n=>Math.round(n*100)).join(','));
    assert.equal(new Set(keys).size,3,'No degenerate triangles');
    for(let e=0;e<3;e++){const key=[keys[e],keys[(e+1)%3]].sort().join('|');edges.set(key,(edges.get(key)||0)+1);}
    const [a,b,c]=vs;volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
  }
  assert.ok([...edges.values()].every(n=>n===2),'Each welded edge has two faces');
  assert.ok(volume>0,'Outward faces enclose positive volume');
  assert.ok(mins[2]>=-.01,'Z-up export rests on z=0');
  assert.ok(Math.max(...maxs.map((n,i)=>n-mins[i]))>500,'Real-scale millimetre geometry');
}
test('All nine styles export closed finite geometry at mm scale',()=>{
  for(const v of vehicles)for(const region of regions)for(const style of styles){const result=buildExport({vehicleId:v.id,selections:{[region.id]:style.id}});assert.equal(result.manifest.vehicleId,v.id);const parts=Object.entries(result.files).filter(([name])=>name.endsWith('.stl'));assert.equal(parts.length,region.id==='sides'?2:1);for(const [,data]of parts)inspectSTL(data);}
});
test('Each car exports its own kit geometry, not a renamed Ferrari kit',()=>{
  const widths=vehicles.map(v=>buildExport({vehicleId:v.id,selections:{rear:'sport'}}).manifest.parts[0].dimensionsMm[0]);
  assert.equal(new Set(widths).size,vehicles.length);
});
test('Kit contains only selected parts and truthful manifest',()=>{
  const result=buildExport({vehicleId:vehicle.id,selections:{front:'subtle',sides:'sport',rear:'stock'}});
  assert.equal(result.manifest.parts.length,3);assert.equal(result.manifest.fitVerified,false);assert.equal(result.manifest.mountsIncluded,false);assert.equal(result.manifest.units,'mm');
  const files=unzipSync(result.zip);assert.equal(Object.keys(files).length,7);assert.ok(!Object.keys(files).some(f=>f.includes('rear')));
  assert.equal(result.manifest.mountingFeaturesIncluded,true);assert.equal(result.manifest.roadUseApproved,false);
  assert.equal(result.manifest.hardwareIncludedInSTL,false);
  assert.ok(files['assembly-guide.html']);assert.ok(files['hardware-bom.csv']);
  assert.equal(result.manifest.hardware.find(h=>h.id==='H1').quantity,12);
  assert.ok(result.manifest.parts.every(p=>p.mounting.holes.length===4));
});
test('Rejects unsupported or empty configuration',()=>{
  for(const input of [{},{vehicleId:vehicle.id,selections:{}},{vehicleId:vehicle.id,selections:{front:'stock'}},{vehicleId:'corolla',selections:{front:'sport'}},{vehicleId:vehicle.id,selections:{window:'sport'}},{vehicleId:vehicle.id,selections:{front:'custom'}}])assert.throws(()=>buildExport(input));
});
test('HTTP catalog, export, individual file and invalid input',async()=>{
  const server=http.createServer(async(req,res)=>{if(!await api(req,res)){res.writeHead(404);res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  try{
    const catalogResponse=await fetch(base+'/api/catalog');
    assert.equal(catalogResponse.headers.get('cache-control'),'no-store');
    const catalog=assertCatalog(await catalogResponse.json());
    assert.deepEqual(catalog.vehicles.map(v=>v.id),vehicles.map(v=>v.id));
    const response=await fetch(base+'/api/exports',{method:'POST',body:JSON.stringify({vehicleId:vehicle.id,selections:{rear:'aggressive'}})});assert.equal(response.status,201);const result=await response.json();
    const part=await fetch(base+result.parts[0].url);assert.equal(part.status,200);inspectSTL(new Uint8Array(await part.arrayBuffer()));
    const zip=await fetch(base+result.downloadUrl);assert.equal(zip.headers.get('content-type'),'application/zip');
    const guide=await fetch(base+result.guideUrl);assert.equal(guide.headers.get('content-type'),'text/html; charset=utf-8');assert.match(await guide.text(),/BENCH DEMO ONLY/);
    assert.equal((await fetch(base+'/api/exports',{method:'POST',body:'not json'})).status,400);
    assert.equal((await fetch(base+'/api/exports/missing/kit.zip')).status,404);
  }finally{await new Promise(r=>server.close(r));}
});
