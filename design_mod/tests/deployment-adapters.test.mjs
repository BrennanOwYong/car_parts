// Real HTTP adapter checks; separate processes prove files survive worker restarts.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {unzipSync} from 'fflate';

const root = fileURLToPath(new URL('../../', import.meta.url));
async function startWorker(command, args, env = process.env) {
  const child = spawn(command, args, {cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
  let logs = '';
  child.stderr.on('data', data => {logs += data;});
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {child.kill(); reject(new Error('Worker did not start: ' + logs));}, 30000);
    let output = '';
    child.stdout.on('data', data => {output += data; const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) {clearTimeout(timer); resolve(match[0]);}});
    child.once('error', error => {clearTimeout(timer); reject(error);});
    child.once('exit', code => {clearTimeout(timer); reject(new Error(`Worker exited ${code}: ${logs}`));});
  });
  return {base, stop: async () => {if (child.exitCode !== null) return; const done = once(child, 'exit'); child.kill(); await done;}};
}
function studioWorker() {
  return startWorker(process.execPath, ['--input-type=module', '-e', `
    import http from 'node:http';
    import handler from './api/studio.mjs';
    const server=http.createServer(async(req,res)=>{
      if(req.headers['x-test-parsed-body']==='true') {
        let body='';for await(const chunk of req)body+=chunk;
        try{req.body=JSON.parse(body);}catch{req.body=body;}
      }
      await handler(req,res);
    });
    server.listen(0,'127.0.0.1',()=>console.log('http://127.0.0.1:'+server.address().port));
  `]);
}
const studioUrl = (base, endpoint) => base + '/api/studio?endpoint=' + encodeURIComponent(endpoint);

test('Vercel studio adapter serves catalog and exports through separate real workers', async () => {
  let worker = await studioWorker(); let exported, original;
  try {
    const catalogResponse = await fetch(studioUrl(worker.base, 'catalog'));
    assert.equal(catalogResponse.status, 200); const catalog = await catalogResponse.json();
    const repair = await fetch(studioUrl(worker.base, 'repair/catalog')); assert.equal(repair.status, 200);
    assert.ok((await repair.json()).vehicles.some(vehicle => vehicle.prepared));
    const created = await fetch(studioUrl(worker.base, 'exports'), {method: 'POST', headers: {'Content-Type': 'application/json', 'x-test-parsed-body': 'true'}, body: JSON.stringify({vehicleId: catalog.vehicles[0].id, selections: {front: 'sport', sides: 'subtle'}})});
    assert.equal(created.status, 201); exported = await created.json(); assert.match(exported.id, /^v1_/);
    original = new Uint8Array(await (await fetch(studioUrl(worker.base, `exports/${exported.id}/kit.zip`))).arrayBuffer());
    const oversized = await fetch(studioUrl(worker.base, 'exports'), {method: 'POST', headers: {'x-test-parsed-body': 'true'}, body: JSON.stringify({value: 'x'.repeat(9000)})}); assert.equal(oversized.status, 413);
    assert.equal((await fetch(studioUrl(worker.base, 'unknown'))).status, 404);
  } finally {await worker.stop();}
  worker = await studioWorker();
  try {
    const response = await fetch(studioUrl(worker.base, `exports/${exported.id}/kit.zip`)); assert.equal(response.status, 200);
    const files = unzipSync(new Uint8Array(await response.arrayBuffer())); const previous = unzipSync(original);
    assert.deepEqual(Object.keys(files), Object.keys(previous));
    for (const [name, bytes] of Object.entries(files)) assert.deepEqual(bytes, previous[name]);
    for (const part of exported.parts) {
      const response = await fetch(studioUrl(worker.base, `exports/${exported.id}/${part.name}`)); assert.equal(response.status, 200);
      const bytes = new Uint8Array(await response.arrayBuffer()); assert.deepEqual(bytes, files[part.name]);
      const triangles = new DataView(bytes.buffer).getUint32(80, true); assert.equal(bytes.length, 84 + triangles * 50);
    }
    assert.equal((await fetch(studioUrl(worker.base, 'exports/v1_invalid/kit.zip'))).status, 404);
    assert.equal((await fetch(studioUrl(worker.base, `exports/${exported.id}/missing.stl`))).status, 404);
  } finally {await worker.stop();}
});

test('Vercel repair adapter validates actual HTTP requests with no configured service key', async () => {
  const env = {...process.env, ASTRA_ENV_FILE: path.join(os.tmpdir(), 'forma-no-service-environment.env')};
  delete env.OPENAI_API_KEY;
  const worker = await startWorker(process.env.FORMA_PYTHON || 'python', ['-u', '-c', "from http.server import HTTPServer; from api.repair import handler; server=HTTPServer(('127.0.0.1',0),handler); print('http://127.0.0.1:'+str(server.server_address[1]),flush=True); server.serve_forever()"], env);
  try {
    const statusResponse = await fetch(worker.base + '/api/repair?action=status'); assert.equal(statusResponse.status, 200);
    const status = await statusResponse.json(); assert.equal(status.configured, false); assert.equal(status.maxRequestBytes, 4_000_000);
    const post = (body, origin = worker.base.replace('http:', 'https:')) => fetch(worker.base + '/api/repair?action=chat', {method: 'POST', headers: {'Content-Type': 'application/json', Origin: origin}, body: typeof body === 'string' ? body : JSON.stringify(body)});
    for (const input of ['invalid-json', {phase: 'unsupported'}, {phase: 'repair_chat', vehicle_asset_id: 'missing'}]) {
      const response = await post(input); assert.equal(response.status, 400); assert.doesNotMatch(await response.text(), /Traceback|Bearer|sk-[A-Za-z0-9]{10}/);
    }
    assert.equal((await post({phase: 'unsupported'}, 'https://foreign.example')).status, 403);
    assert.equal((await post('x'.repeat(4_000_001))).status, 413);
    const response = await post({phase: 'repair_chat', vehicle_asset_id: 'corolla-prepared-demo', images_base64: ['/9j/2Q=='], messages: [{role: 'user', text: 'Review this part.'}], selected_damage_parts: []});
    assert.equal(response.status, 503); assert.match((await response.json()).error, /not configured/);
    assert.equal((await fetch(worker.base + '/api/repair?action=unknown')).status, 404);
  } finally {await worker.stop();}
});
