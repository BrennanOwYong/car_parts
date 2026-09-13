import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {zipSync,strToU8} from 'fflate';
import {STLExporter} from 'three/addons/exporters/STLExporter.js';
import {vehicles,getVehicle,regions,styles,validateConfiguration} from './catalog.mjs';
import {individualParts} from './geometry.mjs';
import {mountingConcept,hardwareBOM} from './hardware.mjs';
import {assemblyGuide,mountingReferences} from './assembly-guide.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const exportsCache=new Map();
const exporter=new STLExporter();
export function buildExport(input) {
  const selections=validateConfiguration(input);
  const vehicle=getVehicle(input.vehicleId);
  const files={},parts=[];
  for(const [region,style] of Object.entries(selections)) {
    for(const part of individualParts(region,style,vehicle.id)) {
      const name=`${part.name}-${style}.stl`;
      part.updateMatrixWorld(true);
      const data=exporter.parse(part,{binary:true});
      files[name]=new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
      const box=part.geometry.boundingBox;
      parts.push({name,region,style,dimensionsMm:['x','y','z'].map(a=>Math.round((box.max[a]-box.min[a])*10)/10),triangles:data.getUint32(80,true),
        mounting:{status:'illustrative-only',coordinateFrame:'Part-local STL coordinates; millimetres; Z-up; hole axes parallel to Z',holes:part.userData.mountPoints}});
      part.geometry.dispose();part.material.dispose();
    }
  }
  const manifest={vehicleId:vehicle.id,vehicleName:`${vehicle.make} ${vehicle.model}`,geometryVersion:3,selections,units:'mm',upAxis:'Z',status:'visual-prototype',fitVerified:false,mountsIncluded:false,mountingFeaturesIncluded:true,hardwareIncludedInSTL:false,roadUseApproved:false,parts,
    mountingConcept,hardware:hardwareBOM(parts),guideStatus:'bench-demo-only',
    note:'Original profiles with illustrative clearance holes. No verified car attachment interface, OEM CAD or car mesh is included. Hardware is purchased, not printed. Do not drill or install on a vehicle from this prototype.'};
  files['manifest.json']=strToU8(JSON.stringify(manifest,null,2));
  files['README.txt']=strToU8('FORMA prototype kit — revision 03\nUnits: millimetres. Z up. One STL per individual part.\nConcept through-holes are included. Their locations are NOT verified against a vehicle.\nNo vehicle installation, drilling or road use is approved. Metal bolts, washers, backing plates and nuts must not be printed from this demo.\nSide skirts are exported as separate left and right files.\nOpen assembly-guide.html for the illustrated bench-demonstration guide (browser Print / Save as PDF). See hardware-bom.csv and manifest.json.\n');
  files['assembly-guide.html']=strToU8(assemblyGuide(manifest));
  files['hardware-bom.csv']=strToU8('id,description,quantity,printable\n'+manifest.hardware.map(item=>`${item.id},"${item.name.replaceAll('"','""')}",${item.quantity},false`).join('\n'));
  return {files,manifest,zip:zipSync(files)};
}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
export async function api(req,res) {
  const url=new URL(req.url,'http://localhost');
  if(!url.pathname.startsWith('/api/')) return false;
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method==='GET' && url.pathname==='/api/catalog') {json(res,200,{vehicles,regions,styles,mountingConcept,mountingReferences});return true;}
  if(req.method==='POST' && url.pathname==='/api/exports') {
    try {
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192) {json(res,413,{error:'Request too large.'});return true;}}
      const result=buildExport(JSON.parse(body));
      for(const [key,value] of exportsCache) if(Date.now()-value.created>3600000) exportsCache.delete(key);
      while(exportsCache.size>=30) exportsCache.delete(exportsCache.keys().next().value);
      const id=randomUUID();exportsCache.set(id,{...result,created:Date.now()});
      json(res,201,{id,...result.manifest,downloadUrl:`/api/exports/${id}/kit.zip`,guideUrl:`/api/exports/${id}/assembly-guide.html`,bomUrl:`/api/exports/${id}/hardware-bom.csv`,parts:result.manifest.parts.map(p=>({...p,url:`/api/exports/${id}/${p.name}`}))});
    }catch(error){json(res,400,{error:error instanceof SyntaxError?'Invalid JSON.':error.message});}
    return true;
  }
  const match=url.pathname.match(/^\/api\/exports\/([\w-]+)\/([\w.-]+)$/);
  if(req.method==='GET' && match) {
    const result=exportsCache.get(match[1]);
    if(!result || Date.now()-result.created>3600000) {json(res,404,{error:'Export expired. Return to the studio and export again.'});return true;}
    const name=match[2],data=name==='kit.zip'?result.zip:result.files[name];
    if(!data){json(res,404,{error:'File not found.'});return true;}
    const isGuide=name==='assembly-guide.html';
    if(isGuide)res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; frame-ancestors 'self'");
    res.writeHead(200,{'Content-Type':isGuide?'text/html; charset=utf-8':name.endsWith('.zip')?'application/zip':'application/octet-stream','Content-Disposition':`${isGuide?'inline':'attachment'}; filename="${name}"`,'Content-Length':data.byteLength});res.end(data);return true;
  }
  json(res,404,{error:'API endpoint not found.'});return true;
}
async function start(){
  const prod=process.env.NODE_ENV==='production'||process.argv.includes('--production');
  const vite=prod?null:await (await import('vite')).createServer({root,server:{middlewareMode:true,hmr:{port:Number(process.env.HMR_PORT||24678)}},appType:'spa'});
  const server=http.createServer(async(req,res)=>{
    try {
      if(await api(req,res)) return;
      if(vite){vite.middlewares(req,res);return;}
      const pathname=new URL(req.url,'http://localhost').pathname;
      const filename=path.resolve(root,'dist','.'+(pathname==='/'?'/index.html':decodeURIComponent(pathname)));
      if(!filename.startsWith(path.join(root,'dist')+path.sep)){res.writeHead(404);res.end();return;}
      const data=await readFile(filename);
      const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.wasm':'application/wasm','.png':'image/png','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'}[path.extname(filename)]||'application/octet-stream';
      res.writeHead(200,{'Content-Type':type,'X-Content-Type-Options':'nosniff'});res.end(data);
    }catch{res.writeHead(404);res.end('Not found');}
  });
  const port=Number(process.env.PORT||8788);
  server.listen(port,'127.0.0.1',()=>console.log(`FORMA studio: http://localhost:${port}`));
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) start();
