import * as THREE from 'three';
import {getVehicle,vehicle as defaultVehicle} from './catalog.mjs';

// Original solid concept geometry. Coordinates are metres in the vehicle scene.
// These are visual profiles, not measured vehicle attachment interfaces.
function profile(points,depth,holes=[],holeScale=[1,1,1]) {
  const shape = new THREE.Shape();
  points.forEach(([x,z],i)=>i ? shape.lineTo(x,z) : shape.moveTo(x,z));
  shape.closePath();
  for(const [x,z] of holes){const hole=new THREE.Path();hole.absellipse(x,z,.0033/holeScale[0],.0033/holeScale[2],0,Math.PI*2,true);shape.holes.push(hole);}
  const g = new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,curveSegments:24});
  g.rotateX(Math.PI/2);
  g.translate(0,depth,0);
  return g;
}
function mesh(geometry,name,position,material,mountPoints=[],thickness=0) {
  const m = new THREE.Mesh(geometry,material);
  m.userData.mountPoints=mountPoints.map(p=>({position:p,clearanceDiameterMm:6.6,thicknessMm:thickness*1000}));
  m.name=name; m.position.set(...position);m.castShadow=true;m.receiveShadow=true;return m;
}
export function createPartGroup(region,style,material,vehicleId=defaultVehicle.id) {
  if (!['front','sides','rear'].includes(region) || !['subtle','sport','aggressive'].includes(style)) throw new Error('Unknown geometry variant.');
  const vehicle=getVehicle(vehicleId);
  if(!vehicle)throw new Error('Unknown vehicle geometry.');
  const level = ['subtle','sport','aggressive'].indexOf(style);
  const group = new THREE.Group();group.name=region;group.userData.region=region;
  const mat=material || new THREE.MeshStandardMaterial({color:0x313641,metalness:.45,roughness:.28});
  const {scale,offset}=vehicle.kit[region];
  if(region==='front') {
    const w=.90+level*.04, extension=.045+level*.065;
    const pts=[[-w,-1.93],[-w*.91,-2.13-extension],[-w*.55,-2.23-extension],[0,-2.26-extension],[w*.55,-2.23-extension],[w*.91,-2.13-extension],[w,-1.93],[w*.8,-2.02],[w*.45,-2.11],[0,-2.14],[-w*.45,-2.11],[-w*.8,-2.02]];
    const depth=.005+level*.002,holes=[[-w*.75,-2.10-extension*.5],[-w*.25,-2.18-extension*.5],[w*.25,-2.18-extension*.5],[w*.75,-2.10-extension*.5]];
    group.add(mesh(profile(pts,depth,holes,scale),'front-lip',[0,.16,0],mat,holes.map(([x,z])=>[x,depth,z]),depth));
  } else if(region==='sides') {
    for (const side of [-1,1]) {
      const w=.07+level*.055;
      const points=[[0,-.78],[w*.4,-.9],[w,-.72],[w,1.03],[w*.65,1.12],[0,1.04]].map(([x,z])=>[side*(.86+x),z]);
      const depth=.006+level*.002,holes=[-.62,-.14,.4,.88].map(z=>[side*(.86+w*.48),z]);
      group.add(mesh(profile(points,depth,holes,scale),side<0?'side-skirt-left':'side-skirt-right',[0,.16,0],mat,holes.map(([x,z])=>[x,depth,z]),depth));
    }
  } else {
    // A continuous ducktail profile, increasing in height and sweep by style.
    const w=.68+level*.1, pts=[[-w,1.72],[-w*.98,1.98],[-w*.6,2.10],[0,2.13],[w*.6,2.10],[w*.98,1.98],[w,1.72],[w*.67,1.81],[0,1.88],[-w*.67,1.81]];
    const depth=.006+level*.002,holes=[[-w*.72,1.94],[-w*.25,1.985],[w*.25,1.985],[w*.72,1.94]];
    const g=profile(pts,depth,holes,scale);
    const pos=g.getAttribute('position');
    for(let i=0;i<pos.count;i++) pos.setY(i,pos.getY(i)+Math.max(0,pos.getZ(i)-1.72)*(.05+level*.16));
    g.computeVertexNormals();
    group.add(mesh(g,'rear-spoiler',[0,.80,0],mat,holes.map(([x,z])=>[x,depth+Math.max(0,z-1.72)*(.05+level*.16),z]),depth));
  }
  group.traverse(o=>{
    o.userData.region=region;o.userData.vehicleId=vehicleId;
    if(o.isMesh){
      o.userData.mountPoints=o.userData.mountPoints.map(m=>({...m,position:new THREE.Vector3(...m.position).add(o.position).multiply(new THREE.Vector3(...scale)).add(new THREE.Vector3(...offset)).toArray(),thicknessMm:m.thicknessMm*scale[1]}));
      // Bake each car's visual profile into geometry: previews and STL share this path.
      o.geometry.translate(...o.position.toArray());o.position.set(0,0,0);
      o.geometry.scale(...scale);o.geometry.translate(...offset);
    }
  });
  return group;
}
export function disposeGroup(group) {
  group.traverse(o=>{o.geometry?.dispose();});
  group.removeFromParent();
}
export function individualParts(region,style,vehicleId=defaultVehicle.id) {
  const group=createPartGroup(region,style,undefined,vehicleId);
  group.updateMatrixWorld(true);
  const parts=group.children.map(original=>{
    const part=original.clone();part.geometry=original.geometry.clone();
    part.geometry.applyMatrix4(original.matrixWorld);
    part.position.set(0,0,0);part.rotation.set(0,0,0);
    // STL has no unit metadata. Export mm and Z-up; document units in manifest.
    part.geometry.rotateX(Math.PI/2);part.geometry.scale(1000,1000,1000);
    part.geometry.computeBoundingBox();const box=part.geometry.boundingBox;
    const translation=new THREE.Vector3(-(box.min.x+box.max.x)/2,-(box.min.y+box.max.y)/2,-box.min.z);
    part.geometry.translate(...translation.toArray());
    part.userData.mountPoints=original.userData.mountPoints.map(m=>({...m,positionMm:new THREE.Vector3(...m.position).applyMatrix4(original.matrixWorld).applyAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2).multiplyScalar(1000).add(translation).toArray().map(n=>Math.round(n*100)/100),position:undefined}));
    part.geometry.computeBoundingBox();
    return part;
  });
  disposeGroup(group);
  return parts;
}
