// Official library references and preparation contract: ../ASSET_PREPARATION.md.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune, compactPrimitive} from '@gltf-transform/functions';
import draco from 'draco3dgltf';
import {Box3, Matrix4, Euler, Vector3} from 'three';
import {repairFamilies, demoVehicle, repairRoot} from '../repair-catalog.mjs';

const hash = data => createHash('sha256').update(data).digest('hex');
const vector = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);

// Connectivity defaults to original indices. Position mode groups seam vertices
// without welding or changing any exported geometry attributes.
export function connectedIndices(indices, vertexCount, positions = null) {
  const parent = Int32Array.from({length: vertexCount}, (_, i) => i);
  const root = i => { while (parent[i] !== i) {parent[i] = parent[parent[i]]; i = parent[i];} return i; };
  // Group coincident seam vertices for connectivity only; original attributes,
  // indices and triangles remain unchanged in the output geometry.
  if (positions) {
    const vertices = new Map(), value = [];
    for (const i of new Set(indices)) {
      positions.getElement(i, value);
      const key = value.map(v => Math.round(v * 100000)).join(',');
      if (vertices.has(key)) parent[root(i)] = root(vertices.get(key));
      else vertices.set(key, i);
    }
  }
  for (let i = 0; i < indices.length; i += 3) {
    const a = root(indices[i]); parent[root(indices[i + 1])] = a; parent[root(indices[i + 2])] = a;
  }
  const groups = new Map();
  for (let i = 0; i < indices.length; i += 3) {
    const key = root(indices[i]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(indices[i], indices[i + 1], indices[i + 2]);
  }
  return [...groups.values()].map(value => new Uint32Array(value));
}

export async function inspectSource(input, separateComponents = false) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder': await draco.createDecoderModule()});
  const jsonDoc = await io.readAsJSON(path.resolve(input));
  const fingerprint = createHash('sha256').update(JSON.stringify(jsonDoc.json));
  for (const key of Object.keys(jsonDoc.resources).sort()) fingerprint.update(key).update(jsonDoc.resources[key]);
  const sourceHash = fingerprint.digest('hex');
  const doc = await io.readJSON(jsonDoc);
  const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
  if (!scene) throw new Error('The source has no scene.');
  const pieces = [], activeNodes = new Set();
  scene.traverse(node => activeNodes.add(node));
  for (const [ni, node] of doc.getRoot().listNodes().entries()) {
    if (!activeNodes.has(node) || !node.getMesh()) continue;
    if (node.getSkin() || node.getExtension('EXT_mesh_gpu_instancing')) throw new Error('Skinned or instanced geometry must be converted to static geometry before preparation.');
    const matrix = new Matrix4().fromArray(node.getWorldMatrix());
    if (!matrix.elements.every(Number.isFinite) || Math.abs(matrix.determinant()) < 1e-12) throw new Error('Invalid source transform.');
    for (const [pi, primitive] of node.getMesh().listPrimitives().entries()) {
      const positions = primitive.getAttribute('POSITION');
      if (!positions || positions.getType() !== 'VEC3' || primitive.getMode() !== 4 || primitive.listTargets().length) throw new Error('Only static triangle surfaces are supported. Convert curves, points or morph targets before preparation.');
      const indices = primitive.getIndices()?.getArray() || Uint32Array.from({length: positions.getCount()}, (_, i) => i);
      if (indices.length === 0 || indices.length % 3 || indices.some(i => !Number.isInteger(i) || i < 0 || i >= positions.getCount())) throw new Error('Invalid source triangle indices.');
      const components = separateComponents ? connectedIndices(indices, positions.getCount(), separateComponents === 'position' ? positions : null) : [indices];
      for (const [ci, component] of components.entries()) {
        const bounds = new Box3(), point = new Vector3(), coords = [];
        for (const index of new Set(component)) {
          positions.getElement(index, coords);
          if (!coords.every(Number.isFinite)) throw new Error('Non-finite source coordinates.');
          bounds.expandByPoint(point.fromArray(coords).applyMatrix4(matrix));
        }
        pieces.push({id: `n${ni}.p${pi}.c${ci}`, name: node.getName() || node.getMesh().getName() || `Surface ${ni + 1}`, material: primitive.getMaterial()?.getName() || '', triangles: component.length / 3, bounds, matrix, primitive, indices: component});
      }
    }
  }
  if (!pieces.length) throw new Error('No triangle surfaces in the default scene.');
  return {io, doc, sourceHash, pieces};
}

export function inventory(source) {
  return {version: 1, sourceHash: source.sourceHash, pieces: source.pieces.map(({id, name, material, triangles, bounds}) => ({id, name, material, triangles, min: bounds.min.toArray(), max: bounds.max.toArray()}))};
}

export async function prepareVehicle(input, mapping, output) {
  const catalog = JSON.parse(await readFile(path.join(repairRoot, '../vehicle_model_catalog.json'), 'utf8'));
  const vehicle = [...catalog.models, ...catalog.local_models].find(v => v.id === mapping.vehicleId);
  if (!vehicle) throw new Error('Choose a vehicle from the reference catalog.');
  const localDemo = mapping.localDemo === true && [demoVehicle.id, 'ferrari-458-demo'].includes(vehicle.id);
  if ((!localDemo && (!mapping.licenseReviewed || !/^\d{4}-\d{2}-\d{2}$/.test(mapping.downloadedAt || ''))) || !mapping.sourceCredit?.trim()) throw new Error('Record licenseReviewed, downloadedAt and sourceCredit from the authorized download.');
  if (!(mapping.lengthMeters > 1 && mapping.lengthMeters < 15) || !mapping.scaleNote?.trim()) throw new Error('Provide display lengthMeters and a scaleNote distinguishing sourced dimensions from estimates.');
  if (!Array.isArray(mapping.parts) || mapping.parts.length < 2) throw new Error('Map at least two real source assemblies.');
  const rotation = mapping.rotationDegrees || [0, 0, 0];
  if (!vector(rotation)) throw new Error('rotationDegrees must contain three finite numbers.');
  const source = await inspectSource(input, mapping.separateComponents || false);
  if (mapping.sourceHash !== source.sourceHash) throw new Error('Source checksum differs from the inspected asset. Inspect again before mapping.');
  const {doc, io, pieces} = source, root = doc.getRoot();
  const pieceMap = new Map(pieces.map(p => [p.id, p])), assigned = new Set(), partIds = new Set();
  for (const part of mapping.parts) {
    if (!/^[a-z][a-z0-9-]*$/.test(part.id) || part.id === 'context' || partIds.has(part.id) || typeof part.label !== 'string' || !part.label.trim()) throw new Error('Parts require unique safe ids and labels.');
    partIds.add(part.id);
    if (part.family != null && !Object.hasOwn(repairFamilies, part.family)) throw new Error(`Unsupported repair family: ${part.family}`);
    if (part.side != null && !['left', 'right', 'center'].includes(part.side)) throw new Error('Invalid part side.');
    if (!vector(part.offsetMeters) || new Vector3(...part.offsetMeters).length() > 10) throw new Error('Each assembly requires a finite offsetMeters vector within 10 metres.');
    if (!Array.isArray(part.pieces) || !part.pieces.length) throw new Error('Each assembly must contain source pieces.');
    for (const id of part.pieces) {
      if (!pieceMap.has(id) || assigned.has(id)) throw new Error(`Missing or multiply assigned source piece: ${id}`);
      assigned.add(id);
    }
  }
  const rotate = new Matrix4().makeRotationFromEuler(new Euler(...rotation.map(v => v * Math.PI / 180)));
  const bounds = new Box3();
  for (const piece of pieces) bounds.union(piece.bounds.clone().applyMatrix4(rotate));
  const size = bounds.getSize(new Vector3());
  if (!(size.z > 0)) throw new Error('Orient the length of the vehicle along the Z axis.');
  const scale = mapping.lengthMeters / size.z, center = bounds.getCenter(new Vector3());
  const normalize = new Matrix4().makeScale(scale, scale, scale).multiply(new Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z)).multiply(rotate);
  const leftovers = pieces.filter(p => !assigned.has(p.id));
  const assemblies = [...mapping.parts, ...(leftovers.length ? [{id: 'context', label: 'Remaining vehicle', pieces: leftovers.map(p => p.id), offsetMeters: [0, 0, 0]}] : [])];
  const oldNodes = [...root.listNodes()];
  for (const scene of [...root.listScenes()]) scene.dispose();
  for (const animation of [...root.listAnimations()]) animation.dispose();
  const scene = doc.createScene(vehicle.title); root.setDefaultScene(scene);
  const buffer = root.listBuffers()[0] || doc.createBuffer();
  const parts = [];
  for (const part of assemblies) {
    const group = doc.createNode(part.label).setExtras({repairPartId: part.id});
    scene.addChild(group);
    let triangles = 0;
    for (const id of part.pieces) {
      const piece = pieceMap.get(id), primitive = piece.primitive.clone();
      primitive.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(piece.indices)).setBuffer(buffer));
      compactPrimitive(primitive);
      const mesh = doc.createMesh(piece.name).addPrimitive(primitive);
      const matrix = normalize.clone().multiply(piece.matrix);
      const node = doc.createNode(piece.name).setMesh(mesh).setMatrix(matrix.toArray()).setExtras({sourcePiece: id});
      group.addChild(node); triangles += piece.triangles;
    }
    parts.push({id: part.id, label: part.label, family: part.family || null, side: part.side || null, offsetMeters: part.offsetMeters, sourcePieces: part.pieces, triangles});
  }
  for (const node of oldNodes) node.dispose();
  // Decode source compression before writing; browser assets no longer require an encoder.
  for (const ext of [...root.listExtensionsUsed()]) if (['KHR_draco_mesh_compression', 'EXT_meshopt_compression'].includes(ext.extensionName)) ext.dispose();
  await doc.transform(prune({keepSolidTextures: true, keepAttributes: true}));
  const binary = await io.writeBinary(doc);
  const manifest = {version: 1, vehicleId: vehicle.id, status: 'prepared', units: 'metres', upAxis: 'Y', frontAxis: mapping.frontAxis || '+Z', fitVerified: false,
    scaleNote: mapping.scaleNote, sourceHash: source.sourceHash, outputHash: hash(binary), downloadedAt: localDemo ? null : mapping.downloadedAt, preparedAt: new Date().toISOString(), localDemo,
    source: {url: vehicle.url, creator: vehicle.creator, license: vehicle.license, licenseUrl: localDemo ? null : 'https://creativecommons.org/licenses/by/4.0/', credit: mapping.sourceCredit},
    modifications: 'Source surfaces regrouped into named visual assemblies; transforms normalized; source materials retained. Original animations omitted. No mounting geometry generated.',
    parts, triangles: parts.reduce((total, p) => total + p.triangles, 0)};
  await mkdir(output, {recursive: true});
  await writeFile(path.join(output, 'vehicle.glb'), binary);
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

async function main() {
  const [command, input, file, output] = process.argv.slice(2);
  if (command === 'inspect' && input && file) {
    const source = await inspectSource(input, process.argv.includes('--position-components') ? 'position' : process.argv.includes('--components'));
    await writeFile(file, JSON.stringify(inventory(source), null, 2) + '\n');
    console.log(`Inspected ${source.pieces.length} source pieces. Inventory: ${file}`);
  } else if (command === 'prepare' && input && file) {
    const mapping = JSON.parse(await readFile(file, 'utf8'));
    const destination = output || path.join(repairRoot, 'public/repair-assets', mapping.vehicleId);
    const result = await prepareVehicle(input, mapping, destination);
    console.log(`Prepared ${result.parts.length} assemblies; ${result.triangles} triangles. ${destination}`);
  } else throw new Error('Usage: node scripts/prepare-vehicle.mjs inspect input.glb inventory.json [--components]\n       node scripts/prepare-vehicle.mjs prepare input.glb mapping.json [output-directory]');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {console.error(error.message); process.exitCode = 1;});
