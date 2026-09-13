import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {zipSync,strToU8} from 'fflate';
import {STLExporter} from 'three/addons/exporters/STLExporter.js';
import {vehicle,regions,styles,validateConfiguration} from './catalog.mjs';
import {individualParts} from './geometry.mjs';
import {repairCatalog} from './repair-catalog.mjs';
import {repairRequest} from './repair-service.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const exporter=new STLExporter();
export function buildExport(input) {
  const selections=validateConfiguration(input);
  const files={},parts=[];
  for(const [region,style] of Object.entries(selections)) {
    for(const part of individualParts(region,style)) {
      const name=`${part.name}-${style}.stl`;
      part.updateMatrixWorld(true);
      const data=exporter.parse(part,{binary:true});
      files[name]=new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
      const box=part.geometry.boundingBox;
      parts.push({name,region,style,dimensionsMm:['x','y','z'].map(a=>Math.round((box.max[a]-box.min[a])*10)/10),triangles:data.getUint32(80,true)});
      part.geometry.dispose();part.material.dispose();
    }
  }
  const manifest={vehicleId:vehicle.id,selections,units:'mm',upAxis:'Z',status:'visual-prototype',fitVerified:false,mountsIncluded:false,parts,
    note:'Original concept profiles for visual prototyping. Vehicle fit, mounting interfaces, material and printer suitability have not been validated. No OEM CAD or vehicle mesh is included.'};
  files['manifest.json']=strToU8(JSON.stringify(manifest,null,2));
  files['README.txt']=strToU8('FORMA prototype kit\nUnits: millimetres. Z up. One STL per individual part.\nVisual prototypes; not verified installation parts. Mounting features are not included.\nSide skirts are exported as separate left and right files.\nSee manifest.json for dimensions and selected styles.\n');
  return {files,manifest,zip:zipSync(files)};
}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function requestBody(req, limit) {
  if (req.body !== undefined && req.body !== null) {
    const body = typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
    if (Buffer.byteLength(body) > limit) throw new RangeError('Request too large.');
    return body;
  }
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > limit) throw new RangeError('Request too large.');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}
function exportIdentity(input) {
  return 'v1_' + Buffer.from(JSON.stringify({vehicleId: vehicle.id, selections: validateConfiguration(input)})).toString('base64url');
}
function exportFromIdentity(id) {
  if (!id.startsWith('v1_') || id.length > 1024) throw new Error('Unknown export.');
  return buildExport(JSON.parse(Buffer.from(id.slice(3), 'base64url').toString('utf8')));
}
export async function api(req,res) {
  const url=new URL(req.url,'http://localhost');
  if(!url.pathname.startsWith('/api/')) return false;
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method==='GET' && url.pathname==='/api/repair/catalog') {json(res,200,await repairCatalog());return true;}
  if(req.method==='GET' && url.pathname==='/api/repair/status') {
    try {const result=await repairRequest(null,true);json(res,result.status,result.result);}
    catch(error){json(res,503,{configured:false,error:error.message});}return true;
  }
  if(req.method==='POST' && url.pathname==='/api/repair/chat') {
    if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}`) {json(res,403,{error:'Use the local FORMA workspace to send photos.'});return true;}
    try {
      const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>20_000_000){json(res,413,{error:'Photos exceed the request limit. Remove a photo and retry.'});return true;}chunks.push(chunk);}
      const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(!payload || !['repair_chat','repair_chat_generate'].includes(payload.phase)) {json(res,400,{error:'Invalid repair phase.'});return true;}
      const result=await repairRequest(payload);json(res,result.status,result.result);
    }catch(error){json(res,error instanceof SyntaxError?400:503,{error:error instanceof SyntaxError?'Invalid JSON.':error.message});}return true;
  }
  if(req.method==='GET' && url.pathname==='/api/catalog') {json(res,200,{vehicles:[vehicle],regions,styles});return true;}
  if(req.method==='POST' && url.pathname==='/api/exports') {
    try {
      const input=JSON.parse(await requestBody(req,8192));
      const result=buildExport(input);
      const id=exportIdentity(input);
      json(res,201,{id,...result.manifest,downloadUrl:`/api/exports/${id}/kit.zip`,parts:result.manifest.parts.map(p=>({...p,url:`/api/exports/${id}/${p.name}`}))});
    }catch(error){json(res,error instanceof RangeError?413:400,{error:error instanceof SyntaxError?'Invalid JSON.':error.message});}
    return true;
  }
  const match=url.pathname.match(/^\/api\/exports\/([\w-]+)\/([\w.-]+)$/);
  if(req.method==='GET' && match) {
    let result;
    try {result=exportFromIdentity(match[1]);}
    catch {json(res,404,{error:'Export unavailable. Return to the studio and export again.'});return true;}
    const name=match[2],data=name==='kit.zip'?result.zip:result.files[name];
    if(!data){json(res,404,{error:'File not found.'});return true;}
    res.writeHead(200,{'Content-Type':name.endsWith('.zip')?'application/zip':'application/octet-stream','Content-Disposition':`attachment; filename="${name}"`,'Content-Length':data.byteLength});res.end(data);return true;
  }
  json(res,404,{error:'API endpoint not found.'});return true;
}
async function start(){
  const prod=process.env.NODE_ENV==='production'||process.argv.includes('--production');
  const vite=prod?null:await (await import('vite')).createServer({root,server:{middlewareMode:true},appType:'spa'});
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
