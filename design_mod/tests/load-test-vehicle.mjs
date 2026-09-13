import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import draco from 'draco3dgltf';
import * as THREE from 'three';

// Decode the actual shipped assets for headless geometry tests. No browser or
// fake replacement car is needed; texture pixels are irrelevant to these tests.
export async function loadTestVehicle(vehicle){
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco.createDecoderModule()});
  const doc=await io.read(new URL('../public'+vehicle.asset,import.meta.url).pathname);
  function node(n){
    const group=new THREE.Group();group.name=n.getName();group.matrix.fromArray(n.getMatrix());group.matrixAutoUpdate=false;
    for(const p of n.getMesh()?.listPrimitives()||[]){
      const g=new THREE.BufferGeometry();
      for(const semantic of p.listSemantics()){
        const name={POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv',TEXCOORD_1:'uv1',COLOR_0:'color',TANGENT:'tangent'}[semantic];
        if(name){const a=p.getAttribute(semantic);g.setAttribute(name,new THREE.BufferAttribute(a.getArray(),a.getElementSize(),a.getNormalized()));}
      }
      if(p.getIndices())g.setIndex(new THREE.BufferAttribute(p.getIndices().getArray(),1));
      const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({name:p.getMaterial()?.getName()}));mesh.name=n.getName();group.add(mesh);
    }
    for(const child of n.listChildren())group.add(node(child));return group;
  }
  const scene=new THREE.Scene();for(const n of doc.getRoot().listScenes()[0].listChildren())scene.add(node(n));return scene;
}
