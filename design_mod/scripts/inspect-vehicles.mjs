import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import draco from 'draco3dgltf';
import * as THREE from 'three';
import {connectedComponents} from '../mesh-components.mjs';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder': await draco.createDecoderModule()});
for (const filename of process.argv.slice(2)) {
  const doc = await io.read(filename);
  console.log(filename);
  for (const node of doc.getRoot().listNodes()) {
    for (const p of node.getMesh()?.listPrimitives() || []) {
      const positions = p.getAttribute('POSITION').getArray();
      const indices = p.getIndices()?.getArray() || Uint32Array.from({length:positions.length / 3}, (_, i) => i);
      if (!/paint|body_color/i.test(p.getMaterial()?.getName())) continue;
      const matrix = new THREE.Matrix4().fromArray(node.getWorldMatrix());
      const components = connectedComponents(positions, indices);
      const rows = components.map(ids => {
        const box = new THREE.Box3(), point = new THREE.Vector3();
        for (const i of ids) box.expandByPoint(point.fromArray(positions, i * 3).applyMatrix4(matrix));
        return {triangles:ids.length / 3, center:box.getCenter(point).toArray().map(n=>+n.toFixed(3)), size:box.getSize(point).toArray().map(n=>+n.toFixed(3))};
      }).sort((a,b)=>b.triangles-a.triangles);
      console.log(node.getName(), p.getMaterial()?.getName(), components.length, JSON.stringify(rows.slice(0,24)));
    }
  }
}
