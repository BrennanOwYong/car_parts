import * as THREE from 'three';
import {connectedComponents} from './mesh-components.mjs';

const paintNames=new Set(['Body_Color','Paint_Color','paint']);

// Compact referenced vertices before computing bounds. The Corolla deliberately
// shares full-car accessors between assemblies; accessor bounds are not part bounds.
export function compactGeometry(source,indices) {
  const remap=new Map(),unique=[],out=[];
  for(const i of indices){if(!remap.has(i)){remap.set(i,unique.length);unique.push(i);}out.push(remap.get(i));}
  const geometry=new THREE.BufferGeometry();
  for(const [name,a] of Object.entries(source.attributes)){
    const data=new Float32Array(unique.length*a.itemSize);
    for(let i=0;i<unique.length;i++)for(let c=0;c<a.itemSize;c++)data[i*a.itemSize+c]=a.getComponent(unique[i],c);
    geometry.setAttribute(name,new THREE.BufferAttribute(data,a.itemSize));
  }
  geometry.setIndex(out);geometry.computeBoundingBox();geometry.computeBoundingSphere();
  return geometry;
}

function indicesFor(geometry) {
  return geometry.index?Array.from(geometry.index.array):Array.from({length:geometry.attributes.position.count},(_,i)=>i);
}
function sourceAssembly(mesh,adapter) {
  if(adapter==='corolla'){
    let n=mesh;while(n.parent&&n.parent.name!=='Corolla'&&n.parent.type!=='Scene')n=n.parent;
    return n.name.replaceAll('_',' ');
  }
  return null;
}

// Classification moves intact, connected source islands, never slices a panel
// along an arbitrary plane. These are visual assembly groups, not OEM CAD parts.
export function classifyAssembly(box,materialName,nodeName,adapter) {
  const c=box.getCenter(new THREE.Vector3()),s=box.getSize(new THREE.Vector3());
  const {x,y,z}=c,side=x>0?'Left':'Right',paint=paintNames.has(materialName)||materialName==='coat';
  if(/steering/.test(nodeName))return 'Cabin interior';
  if(/tire|rim_|wheel|brake|centre|nuts/.test(nodeName)&&adapter==='ferrari'&&y<.76){
    return `${side} ${z<0?'front':'rear'} ${/tire/.test(nodeName)?'tire':/brake/.test(nodeName)?'brake':'wheel'}`;
  }
  if(adapter==='porsche'&&/Cylinder/.test(nodeName))return `${side} ${z<0?'front':'rear'} ${materialName==='rubber'?'tire':materialName==='Material.001'?'brake':'wheel'}`;
  if(s.z>3.1||s.x>1.65&&s.y>.9)return y<.4?'Chassis & underbody':'Body structure';
  if(Math.abs(x)>.91&&y>.72&&s.z<.5)return `${side} mirror`;
  const glass=/Glass_Gray|window/.test(materialName);
  if(glass){
    if(Math.abs(x)>.55&&Math.abs(z)<1.05)return `${side} glass`;
    if(y>.7&&s.z>.25)return z<0?'Windshield':'Rear windshield';
    return z<0?`${side} headlamp`:'Rear lamps';
  }
  if(/lights|leds|Projector|Turn_Signal|Taillight/.test(nodeName+' '+materialName))return z<-.6?`${side} headlamp`:'Rear lamps';
  if(paint){
    if(y>1.13&&Math.abs(z)<.8)return 'Roof panel';
    if(z< -1.7&&y<.76)return 'Front bumper';
    if(z>1.7&&y<.82)return 'Rear bumper';
    if(z>1.28&&y>.8&&Math.abs(x)<.55)return 'Rear deck';
    if(z<-.85&&Math.abs(x)<.5&&y>.59)return 'Hood';
    if(Math.abs(x)>.58){
      if(y<.33&&z>-.95&&z<1.2)return `${side} rocker`;
      if(z<-.9)return `${side} front fender`;
      if(z>.8)return `${side} rear quarter`;
      return `${side} door`;
    }
    return 'Body structure';
  }
  if(/windshield|wipers/.test(nodeName))return 'Windshield';
  if(/underbody/.test(nodeName)||y<.2)return 'Chassis & underbody';
  if(z< -1.62)return 'Front bumper';
  if(z>1.63)return y>.82?'Rear deck':'Rear bumper';
  if(Math.abs(x)>.73&&s.x<.4&&s.z<1.5)return z<-.85?`${side} front fender`:z>.85?`${side} rear quarter`:`${side} door`;
  return 'Cabin interior';
}

export function assemblyOffset(name) {
  const side=name.startsWith('Left')?1:-1,front=name.includes('front');
  if(name.includes(' tire'))return new THREE.Vector3(side*1.8,.08,front?-.25:.25);
  if(name.includes(' wheel'))return new THREE.Vector3(side*1.3,.08,front?-.25:.25);
  if(name.includes(' brake'))return new THREE.Vector3(side*.7,.08,front?-.25:.25);
  if(name.includes('mirror'))return new THREE.Vector3(side*1.55,.65,-.15);
  if(name.includes('glass'))return new THREE.Vector3(side*1.35,1.25,front?-.2:.2);
  if(name.includes('door'))return new THREE.Vector3(side*1.55,.12,name.includes('rear')?.4:-.12);
  if(name.includes('fender'))return new THREE.Vector3(side*.85,.65,-.8);
  if(name.includes('quarter'))return new THREE.Vector3(side*.85,.6,.8);
  if(name.includes('rocker'))return new THREE.Vector3(side*1.25,.08,0);
  if(name.includes('headlamp'))return new THREE.Vector3(side*.4,.85,-1.55);
  const offsets={'Roof panel':[0,1.85,0],Sunroof:[0,2.35,0],Hood:[0,1.45,-.75],
    'Trunk lid':[0,1.35,.9],'Rear deck':[0,1.35,.9],Windshield:[0,1.65,-.6],
    'Rear windshield':[0,1.65,.85],'Front bumper':[0,.12,-1.8],'Rear bumper':[0,.12,1.8],
    'Front grille':[0,.15,-2.15],'Rear lamps':[0,.8,1.9],'Cabin interior':[0,.55,0],
    'Body structure':[0,.35,0],'Chassis & underbody':[0,-.8,0]};
  return new THREE.Vector3(...(offsets[name]||[0,.35,0]));
}
export function assemblyRegion(name){
  if(name==='Front bumper')return 'front';
  if(name.endsWith('rocker'))return 'sides';
  if(name==='Trunk lid'||name==='Rear deck')return 'rear';
  return null;
}
export function modificationOffset(region,side=1){
  return assemblyOffset(region==='front'?'Front bumper':region==='rear'?'Rear deck':side>0?'Left rocker':'Right rocker');
}

function displayMaterial(original,vehicle,color) {
  if(paintNames.has(original.name))return new THREE.MeshPhysicalMaterial({
    name:'Studio paint',color,metalness:.8,roughness:.25,clearcoat:1,clearcoatRoughness:.12,
    aoMap:original.aoMap,normalMap:original.normalMap,
  });
  const m=original.clone();m.envMapIntensity=1.05;
  if(m.transparent)m.depthWrite=false;
  if(m.roughness<.08)m.roughness=.1;
  if(vehicle.adapter==='ferrari'){
    if(original.name==='Glass_Gray'){m.color.set('#101927');m.metalness=.35;m.roughness=.12;m.transparent=true;m.opacity=.94;m.depthWrite=false;}
    if(/Leather|Interior|Carpet/.test(original.name)){m.color.set('#171b21');m.metalness=0;m.roughness=.78;}
    if(original.name==='Tires'){m.color.set('#090b0e');m.metalness=0;m.roughness=.87;}
  }
  // The Porsche has a separate legacy clearcoat shell; physical paint already
  // supplies that lobe. Keep its source geometry for attribution/inspection,
  // but do not double-render it over the physically based paint.
  return m;
}

export function prepareVehicle(source,vehicle,color='#b7bec7') {
  source.updateMatrixWorld(true);
  const entries=[],rotation=new THREE.Matrix4().makeRotationY(vehicle.rotationY);
  source.traverse(mesh=>{
    if(!mesh.isMesh)return;
    // Only this documented source ground plane is excluded, not vehicle detail.
    if(vehicle.adapter==='porsche'&&mesh.name==='Plane_0')return;
    const material=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
    const geometry=compactGeometry(mesh.geometry,indicesFor(mesh.geometry));
    geometry.applyMatrix4(mesh.matrixWorld).applyMatrix4(rotation);geometry.computeBoundingBox();
    entries.push({mesh,geometry,material,name:sourceAssembly(mesh,vehicle.adapter)});
  });
  const bounds=new THREE.Box3();for(const e of entries)bounds.union(e.geometry.boundingBox);
  const center=bounds.getCenter(new THREE.Vector3()),scale=vehicle.dimensions.length/1000/bounds.getSize(new THREE.Vector3()).z;
  const root=new THREE.Group(),overlayRoot=new THREE.Group(),assemblies=new Map(),materials=new Map(),paint=[];
  const overlays={front:[],sides:[],rear:[]};
  root.name=vehicle.id;
  let sourceTriangles=0,displayTriangles=0;
  for(const entry of entries){
    const {mesh,geometry,material}=entry;
    geometry.translate(-center.x,-bounds.min.y,-center.z).scale(scale,scale,scale);
    const ids=indicesFor(geometry);sourceTriangles+=ids.length/3;
    if(!materials.has(material)){
      const m=displayMaterial(material,vehicle,color);materials.set(material,m);
      if(paintNames.has(material.name))paint.push(m);
    }
    // Retain prepared Corolla assemblies. Other assets are grouped from intact
    // connected islands (including separately modeled left/right wheels).
    const components=entry.name?[ids]:connectedComponents(geometry.attributes.position.array,ids,!paintNames.has(material.name)&&material.name!=='coat');
    const buckets=new Map();
    for(const component of components){
      const box=new THREE.Box3(),point=new THREE.Vector3();
      for(const i of component)box.expandByPoint(point.fromBufferAttribute(geometry.attributes.position,i));
      const name=entry.name||classifyAssembly(box,material.name,mesh.name,vehicle.adapter);
      if(!buckets.has(name))buckets.set(name,[]);
      const bucket=buckets.get(name);for(const i of component)bucket.push(i);
    }
    for(const [name,indices] of buckets){
      if(!assemblies.has(name)){
        const group=new THREE.Group();group.name=name;group.userData.offset=assemblyOffset(name);root.add(group);assemblies.set(name,group);
      }
      const group=assemblies.get(name),g=compactGeometry(geometry,indices);
      const object=new THREE.Mesh(g,materials.get(material));object.name=mesh.name;object.castShadow=true;object.receiveShadow=true;
      object.userData.assembly=name;
      const region=assemblyRegion(name);
      if(region&&paintNames.has(material.name))object.userData.region=region;
      if(vehicle.adapter==='porsche'&&material.name==='coat')object.visible=false;
      group.add(object);displayTriangles+=indices.length/3;
      if(object.userData.region){
        const overlay=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xa9c5eb,transparent:true,opacity:.36,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,side:THREE.DoubleSide}));
        overlay.visible=false;overlay.userData.offset=group.userData.offset;overlayRoot.add(overlay);overlays[region].push(overlay);
      }
    }
    geometry.dispose();
  }
  for(const group of assemblies.values())group.userData.center=new THREE.Box3().setFromObject(group,true).getCenter(new THREE.Vector3());
  return {root,overlayRoot,assemblies:[...assemblies.values()],overlays,paint,sourceTriangles,displayTriangles,vehicleId:vehicle.id};
}

export function updateExploded(model,parts,amount){
  for(const g of model.assemblies)g.position.copy(g.userData.offset).multiplyScalar(amount);
  for(const o of model.overlayRoot.children)o.position.copy(o.userData.offset).multiplyScalar(amount);
  for(const group of parts.children)for(const part of group.children){
    if(!part.geometry.boundingBox)part.geometry.computeBoundingBox();
    const side=part.geometry.boundingBox.getCenter(new THREE.Vector3()).x>=0?1:-1;
    part.position.copy(modificationOffset(group.userData.region,side)).multiplyScalar(amount);
  }
  model.root.updateMatrixWorld(true);parts.updateMatrixWorld(true);
}

export function disposeObject(root,{textures=true}={}){
  const geometries=new Set(),materials=new Set(),maps=new Set();
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
  for(const g of geometries)g.dispose();
  for(const m of materials){if(textures)for(const value of Object.values(m))if(value?.isTexture)maps.add(value);m.dispose();}
  for(const map of maps)map.dispose();root.removeFromParent();
}
