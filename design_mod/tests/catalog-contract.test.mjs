import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {vehicles,regions,styles} from '../catalog.mjs';
import {assertCatalog,CATALOG_SCHEMA_VERSION} from '../catalog-contract.mjs';
import {shouldRestartServer} from '../scripts/dev.mjs';
const current=()=>structuredClone({schemaVersion:CATALOG_SCHEMA_VERSION,vehicles,regions,styles});

test('Current three-car catalog provides all required labels, transforms and local assets',()=>{
  const catalog=current();assert.equal(assertCatalog(catalog),catalog);
  for(const car of catalog.vehicles)assert.ok(existsSync(new URL('../public'+car.asset,import.meta.url)),car.asset);
});
test('Rejects the stale single-Ferrari API before undefined labels can render',()=>{
  const legacy={vehicles:[{id:'ferrari-458-italia',make:'Ferrari',model:'458 Italia',year:'2010',asset:'/assets/ferrari.glb'}],regions,styles};
  assert.throws(()=>assertCatalog(legacy),/out of sync.*Stop the old server/);
});
test('Missing fields and invalid transforms produce actionable catalog errors',()=>{
  for(const field of ['shortName','bodyStyle','adapter','asset','kit']){
    const data=current();delete data.vehicles[0][field];assert.throws(()=>assertCatalog(data),/out of sync/);
  }
  for(const value of [null,{}, {...current(),vehicles:[]},{...current(),schemaVersion:999}])assert.throws(()=>assertCatalog(value),/out of sync/);
  const duplicate=current();duplicate.vehicles.push(duplicate.vehicles[0]);assert.throws(()=>assertCatalog(duplicate),/out of sync/);
  const invalid=current();invalid.vehicles[0].kit.front.scale[0]=NaN;assert.throws(()=>assertCatalog(invalid),/out of sync/);
});
test('Startup scripts keep backend imports and production frontend current',()=>{
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url)));
  assert.equal(pkg.scripts.dev,'node scripts/dev.mjs');
  assert.equal(pkg.scripts.prestart,'npm run build');
});
test('Backend watcher ignores Vite temporary files and generated build output',()=>{
  for(const filename of ['server.mjs','catalog.mjs','geometry.mjs','catalog-contract.mjs','package.json','vite.config.js'])assert.ok(shouldRestartServer(filename));
  for(const filename of [null,'dist','node_modules','src','index.html','node_modules/.vite-temp/config.mjs','src/main.js'])assert.equal(shouldRestartServer(filename),false);
});
