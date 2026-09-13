import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Box3, Matrix4, Vector3} from 'three';
import {inspectSource, inventory, prepareVehicle, connectedIndices} from '../scripts/prepare-vehicle.mjs';

const input = fileURLToPath(new URL('../public/assets/corolla-exploded.glb', import.meta.url));
let source, mapping, folder, manifest, output;
before(async () => {
  source = await inspectSource(input);
  mapping = JSON.parse(await readFile(new URL('./fixtures/corolla-mapping.json', import.meta.url), 'utf8'));
  folder = await mkdtemp(path.join(os.tmpdir(), 'forma-prepare-tests-'));
});
after(async () => {if (folder) await rm(folder, {recursive: true, force: true});});

test('Actual Corolla inventory retains stable pieces and named visual assemblies', () => {
  const report = inventory(source);
  assert.equal(report.sourceHash, mapping.sourceHash);
  assert.equal(report.pieces.length, 88);
  assert.equal(new Set(report.pieces.map(p => p.name)).size, 43);
  assert.equal(report.pieces.reduce((sum, p) => sum + p.triangles, 0), 205990);
  assert.equal(new Set(report.pieces.map(p => p.material)).size, 6);
  assert.deepEqual(new Set(mapping.parts.flatMap(p => p.pieces)), new Set(report.pieces.map(p => p.id)));
});

test('Connectivity preserves disconnected indexed islands and shared edges', () => {
  const groups = connectedIndices(new Uint32Array([0,1,2,2,1,3,4,5,6]), 7);
  assert.deepEqual(groups.map(x => Array.from(x)), [[0,1,2,2,1,3],[4,5,6]]);
  assert.deepEqual(connectedIndices(new Uint32Array([0,1,2,3,4,5]), 6).map(x => Array.from(x)), [[0,1,2],[3,4,5]]);
});

test('Source checksum and duplicate assignment errors fail before output creation', async () => {
  await assert.rejects(prepareVehicle(input, {...mapping, sourceHash: 'changed'}, path.join(folder, 'bad-hash')), /checksum/);
  const duplicate = structuredClone(mapping);
  duplicate.parts[1].pieces.push(duplicate.parts[0].pieces[0]);
  await assert.rejects(prepareVehicle(input, duplicate, path.join(folder, 'duplicate')), /multiply assigned/);
});

test('Local-only permission cannot be applied to a requested vehicle', async () => {
  const catalog = JSON.parse(await readFile(new URL('../../vehicle_model_catalog.json', import.meta.url), 'utf8'));
  await assert.rejects(prepareVehicle(input, {...mapping, vehicleId: catalog.models[0].id}, path.join(folder, 'wrong-identity')), /licenseReviewed/);
});

test('Prepared actual Corolla preserves every transformed triangle and material', async () => {
  manifest = await prepareVehicle(input, mapping, path.join(folder, 'prepared'));
  output = await inspectSource(path.join(folder, 'prepared', 'vehicle.glb'));
  assert.equal(manifest.vehicleId, 'corolla-prepared-demo');
  assert.equal(manifest.status, 'prepared');
  assert.equal(manifest.fitVerified, false);
  assert.equal(manifest.parts.length, 43);
  assert.equal(manifest.triangles, 205990);
  assert.equal(output.pieces.length, source.pieces.length);
  assert.equal(output.doc.getRoot().listAnimations().length, 0);
  assert.equal(output.doc.getRoot().listMaterials().length, source.doc.getRoot().listMaterials().length);
  assert.equal(manifest.outputHash, createHash('sha256').update(await readFile(path.join(folder, 'prepared', 'vehicle.glb'))).digest('hex'));
  const bounds = new Box3();
  for (const p of source.pieces) bounds.union(p.bounds);
  const center = bounds.getCenter(new Vector3()), scale = mapping.lengthMeters / (bounds.max.z - bounds.min.z);
  const normalization = new Matrix4().makeScale(scale, scale, scale).multiply(new Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z));
  const outputNodes = new Map(output.doc.getRoot().listNodes().filter(n => n.getExtras().sourcePiece).map(n => [n.getExtras().sourcePiece, n]));
  let compared = 0;
  for (const piece of source.pieces) {
    const node = outputNodes.get(piece.id);
    assert.ok(node, `Original source piece ${piece.id} exists`);
    const primitive = node.getMesh().listPrimitives()[0];
    assert.equal(primitive.getMaterial()?.getName(), piece.material);
    const sourcePositions = piece.primitive.getAttribute('POSITION');
    const positions = primitive.getAttribute('POSITION'), indices = primitive.getIndices().getArray();
    assert.equal(indices.length, piece.indices.length);
    const expectedMatrix = normalization.clone().multiply(piece.matrix);
    const actualMatrix = new Matrix4().fromArray(node.getWorldMatrix());
    const a = [], b = [], expected = new Vector3(), actual = new Vector3();
    for (let i = 0; i < indices.length; i++) {
      sourcePositions.getElement(piece.indices[i], a);
      positions.getElement(indices[i], b);
      expected.fromArray(a).applyMatrix4(expectedMatrix);
      actual.fromArray(b).applyMatrix4(actualMatrix);
      assert.ok(expected.distanceTo(actual) < 1e-6, `Triangle corner preserved for ${piece.id}`);
      compared++;
    }
  }
  assert.equal(compared, 205990 * 3);
  assert.equal(output.doc.getRoot().listTextures().length, source.doc.getRoot().listTextures().length);
  const textureSignatures = document => document.getRoot().listTextures().map(texture => [texture.getName(), createHash('sha256').update(texture.getImage()).digest('hex')]).sort((a,b) => a[0].localeCompare(b[0]));
  assert.deepEqual(textureSignatures(output.doc), textureSignatures(source.doc));
  assert.equal(manifest.localDemo, true);
  assert.equal(manifest.downloadedAt, null);
  assert.equal(manifest.source.licenseUrl, null);
  assert.match(manifest.source.license, /unverified/i);
});

test('Unassigned real surfaces remain in context instead of disappearing', async () => {
  const partial = {...mapping, parts: mapping.parts.slice(0, 2)};
  const result = await prepareVehicle(input, partial, path.join(folder, 'partial'));
  assert.equal(result.parts.length, 3);
  const remaining = result.parts.find(part => part.id === 'context');
  assert.equal(remaining.family, null);
  assert.equal(result.triangles, 205990);
  assert.deepEqual(new Set(result.parts.flatMap(part => part.sourcePieces)), new Set(source.pieces.map(part => part.id)));
});

test('Installed real Ferrari preserves source surfaces and materials as four wheels plus unmapped context', async () => {
  const ferrariSource=await inspectSource(fileURLToPath(new URL('../public/assets/ferrari.glb',import.meta.url)));
  const ferrariOutput=await inspectSource(fileURLToPath(new URL('../public/repair-assets/ferrari-458-demo/vehicle.glb',import.meta.url)));
  const ferrariManifest=JSON.parse(await readFile(new URL('../public/repair-assets/ferrari-458-demo/manifest.json',import.meta.url),'utf8'));
  const ferrariMapping=JSON.parse(await readFile(new URL('../asset-mappings/ferrari-mapping.json',import.meta.url),'utf8'));
  assert.equal(inventory(ferrariSource).sourceHash,ferrariMapping.sourceHash);
  assert.equal(ferrariManifest.sourceHash,ferrariMapping.sourceHash);
  assert.equal(ferrariManifest.vehicleId,'ferrari-458-demo');
  assert.equal(ferrariManifest.parts.length,5);
  assert.equal(ferrariManifest.parts.filter(part=>part.id.startsWith('wheel-')).length,4);
  assert.ok(ferrariManifest.parts.some(part=>part.id==='context'));
  assert.ok(ferrariManifest.parts.every(part=>part.family===null));
  assert.equal(ferrariManifest.triangles,358788);
  assert.equal(ferrariOutput.pieces.reduce((sum,piece)=>sum+piece.indices.length/3,0),358788);
  assert.equal(ferrariSource.pieces.length,ferrariOutput.pieces.length);
  assert.deepEqual(new Set(ferrariManifest.parts.flatMap(part=>part.sourcePieces)),new Set(ferrariSource.pieces.map(part=>part.id)));
  assert.deepEqual(ferrariOutput.doc.getRoot().listMaterials().map(material=>material.getName()).sort(),ferrariSource.doc.getRoot().listMaterials().map(material=>material.getName()).sort());
  const textures=document=>document.getRoot().listTextures().map(texture=>createHash('sha256').update(texture.getImage()).digest('hex')).sort();
  assert.deepEqual(textures(ferrariOutput.doc),textures(ferrariSource.doc));
  assert.equal(ferrariManifest.fitVerified,false);
});
