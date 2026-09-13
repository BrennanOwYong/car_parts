import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {applyCadEvidence} from './cad-evidence.js';

// Browser previews are separate from CAD. Export contract (Three.js r180):
// https://threejs.org/docs/pages/GLTFExporter.html
const key = 'forma-part-variants-v1';
let saved = {};
try {const parsed=JSON.parse(localStorage.getItem(key) || '{}');if(parsed && typeof parsed==='object' && !Array.isArray(parsed))saved=parsed;} catch { /* Storage is optional. */ }
export const variantFor = (vehicleId, partId) => saved[vehicleId]?.[partId];

export function saveVariant(vehicleId, partId, variant) {
  saved[vehicleId] ||= {}; saved[vehicleId][partId] = variant;
  try {localStorage.setItem(key, JSON.stringify(saved));} catch { /* Keep the current session usable. */ }
}

export function replacementMeshes(group, profile = 'sport') {
  group.updateWorldMatrix(true, true);
  const inverse = group.matrixWorld.clone().invert(), geometries = [], bounds = new THREE.Box3();
  for (const child of group.userData.baseChildren || group.children) child.traverse(mesh => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry.clone().applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
    geometry.computeBoundingBox(); bounds.union(geometry.boundingBox); geometries.push(geometry);
  });
  const center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
  const strength = profile === 'sport' ? .018 : .007;
  return geometries.map(geometry => {
    const position = geometry.getAttribute('position');
    for (let i=0;i<position.count;i++) {
      const x=position.getX(i), y=position.getY(i), z=position.getZ(i);
      const t=(z-bounds.min.z)/Math.max(size.z,.001);
      // Fixture deformation for the scan demo, not image reconstruction.
      // Production replaces this with the reconstructed CAD surface tessellation.
      position.setXYZ(i,x+(x-center.x)/Math.max(size.x,.001)*strength,y-Math.sin(t*Math.PI)*strength,z);
    }
    position.needsUpdate=true; geometry.computeVertexNormals(); geometry.computeBoundingBox();
    return new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:profile==='sport'?0x9fa9ba:0xb8a485,metalness:.65,roughness:.3,side:THREE.DoubleSide}));
  });
}

export function applyVariant(group, variant) {
  group.userData.baseChildren ||= [...group.children];
  for (const mesh of group.userData.variantMeshes || []) {mesh.removeFromParent(); mesh.geometry.dispose(); mesh.material.dispose();}
  const meshes = replacementMeshes(group, variant.profile);
  group.userData.baseChildren.forEach(child => {child.visible=false;});
  meshes.forEach(mesh => group.add(mesh));
  group.userData.variantMeshes=meshes;
  group.userData.edited=true;
  const materials=[];
  for(const mesh of meshes){const material=mesh.material;material.userData.original={color:material.color.clone(),emissive:material.emissive.clone(),emissiveIntensity:material.emissiveIntensity};materials.push(material);}
  group.userData.highlightMaterials=materials;
  const assembled = new THREE.Box3(); meshes.forEach(mesh=>assembled.union(mesh.geometry.boundingBox));
  group.userData.assembledBounds=assembled;
}

export function applySavedVariants(model, vehicleId) {
  model.traverse(group=>{const id=group.userData.repairPartId;if(id && variantFor(vehicleId,id)) applyVariant(group,variantFor(vehicleId,id));});
  applyCadEvidence(model, vehicleId);
}

export function cadForMeshes(meshes) {
  let result='// FORMA simulated scan prototype. Units: millimetres.\n// Visual surfaces, not manufacturing solids. Mounting features are not inferred.\n';
  for(const mesh of meshes){const positions=mesh.geometry.getAttribute('position'),indices=mesh.geometry.index;
    const points=Array.from({length:positions.count},(_,i)=>[positions.getX(i),positions.getY(i),positions.getZ(i)].map(v=>Number((v*1000).toFixed(3))));
    const count=indices?.count||positions.count,faces=[];
    for(let i=0;i<count;i+=3)faces.push([0,1,2].map(j=>indices?indices.getX(i+j):i+j));
    result+=`polyhedron(points=${JSON.stringify(points)},faces=${JSON.stringify(faces)},convexity=10);\n`;
  }return result;
}

export async function glbForMeshes(meshes) {
  const scene=new THREE.Scene();
  meshes.forEach(mesh=>{const copy=new THREE.Mesh(mesh.geometry,mesh.material);scene.add(copy);});
  return new GLTFExporter().parseAsync(scene,{binary:true});
}

export function downloadFile(data, name, type='application/octet-stream') {
  const url=URL.createObjectURL(new Blob([data],{type})),anchor=document.createElement('a');
  anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
