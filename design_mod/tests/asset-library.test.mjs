import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ferrariVehicle, corollaVehicle, repairVehicles, preparedAsset} from '../asset-library.mjs';
import {vehicle} from '../catalog.mjs';
import {repairCatalog} from '../repair-catalog.mjs';

test('Design and repair share the authoritative vehicle registry without relabeling pending sources', async () => {
  const registry = JSON.parse(await readFile(new URL('../../vehicle_model_catalog.json', import.meta.url), 'utf8'));
  assert.deepEqual(ferrariVehicle, registry.local_models.find(item=>item.id==='ferrari-458-demo'));
  assert.deepEqual(corollaVehicle, registry.local_models.find(item=>item.id==='corolla-prepared-demo'));
  assert.equal(vehicle, ferrariVehicle);
  assert.deepEqual(repairVehicles.map(item=>item.id), [...registry.models.map(item=>item.id), ...registry.local_models.filter(item=>item.demo).map(item=>item.id)]);
  const catalog = await repairCatalog();
  assert.equal(catalog.vehicles.length,6);
  assert.equal(catalog.vehicles.filter(item=>item.prepared).length,2);
  const ferrari = catalog.vehicles.find(item=>item.id===ferrariVehicle.id);
  assert.equal(ferrari.prepared.asset,preparedAsset(ferrariVehicle.id));
  assert.equal(ferrari.prepared.vehicleId,ferrariVehicle.id);
  assert.equal(ferrari.prepared.parts.filter(part=>part.family).length,0);
  assert.equal(ferrari.prepared.parts.filter(part=>part.id.startsWith('wheel-')).length,4);
  assert.ok(ferrari.repairNotice);
  const demo = catalog.vehicles.find(item=>item.id===corollaVehicle.id);
  assert.equal(demo.animatedAsset,corollaVehicle.animatedAsset);
  assert.equal(demo.prepared.asset,preparedAsset(corollaVehicle.id));
  assert.equal(demo.prepared.vehicleId,corollaVehicle.id);
  assert.equal(demo.prepared.localDemo,true);
});
