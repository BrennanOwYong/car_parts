import * as THREE from 'three';

// Original solid concept geometry. Coordinates are metres in the vehicle scene.
// These are visual profiles, not measured vehicle attachment interfaces.
function profile(points,depth) {
  const shape = new THREE.Shape();
  points.forEach(([x,z],i)=>i ? shape.lineTo(x,z) : shape.moveTo(x,z));
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,curveSegments:24});
  g.rotateX(Math.PI/2);
  g.translate(0,depth,0);
  return g;
}
function mesh(geometry,name,position,material) {
  const m = new THREE.Mesh(geometry,material);
  m.name=name; m.position.set(...position);m.castShadow=true;m.receiveShadow=true;return m;
}
export function createPartGroup(region,style,material) {
  if (!['front','sides','rear'].includes(region) || !['subtle','sport','aggressive'].includes(style)) throw new Error('Unknown geometry variant.');
  const level = ['subtle','sport','aggressive'].indexOf(style);
  const group = new THREE.Group();group.name=region;group.userData.region=region;
  const mat=material || new THREE.MeshStandardMaterial({color:0x313641,metalness:.45,roughness:.28});
  if(region==='front') {
    const w=.90+level*.04, extension=.045+level*.065;
    const pts=[[-w,-1.93],[-w*.91,-2.13-extension],[-w*.55,-2.23-extension],[0,-2.26-extension],[w*.55,-2.23-extension],[w*.91,-2.13-extension],[w,-1.93],[w*.8,-2.02],[w*.45,-2.11],[0,-2.14],[-w*.45,-2.11],[-w*.8,-2.02]];
    group.add(mesh(profile(pts,.018+level*.014),'front-lip',[0,.16,0],mat));
  } else if(region==='sides') {
    for (const side of [-1,1]) {
      const w=.07+level*.055;
      const points=[[0,-.78],[w*.4,-.9],[w,-.72],[w,1.03],[w*.65,1.12],[0,1.04]].map(([x,z])=>[side*(.86+x),z]);
      group.add(mesh(profile(points,.035+level*.025),side<0?'side-skirt-left':'side-skirt-right',[0,.16,0],mat));
    }
  } else {
    // A continuous ducktail profile, increasing in height and sweep by style.
    const w=.68+level*.1, pts=[[-w,1.72],[-w*.98,1.98],[-w*.6,2.10],[0,2.13],[w*.6,2.10],[w*.98,1.98],[w,1.72],[w*.67,1.81],[0,1.88],[-w*.67,1.81]];
    const g=profile(pts,.025+level*.012);
    const pos=g.getAttribute('position');
    for(let i=0;i<pos.count;i++) pos.setY(i,pos.getY(i)+Math.max(0,pos.getZ(i)-1.72)*(.05+level*.16));
    g.computeVertexNormals();
    group.add(mesh(g,'rear-spoiler',[0,.80,0],mat));
  }
  group.traverse(o=>{o.userData.region=region;});
  return group;
}
export function disposeGroup(group) {
  group.traverse(o=>{if(o.isMesh) o.geometry.dispose();});
  group.removeFromParent();
}
export function individualParts(region,style) {
  const group=createPartGroup(region,style);
  group.updateMatrixWorld(true);
  return group.children.map(original=>{
    const part=original.clone();part.geometry=original.geometry.clone();
    part.geometry.applyMatrix4(original.matrixWorld);
    part.position.set(0,0,0);part.rotation.set(0,0,0);
    // STL has no unit metadata. Export mm and Z-up; document units in manifest.
    part.geometry.rotateX(Math.PI/2);part.geometry.scale(1000,1000,1000);
    part.geometry.computeBoundingBox();const box=part.geometry.boundingBox;
    part.geometry.translate(-(box.min.x+box.max.x)/2,-(box.min.y+box.max.y)/2,-box.min.z);
    part.geometry.computeBoundingBox();
    return part;
  });
}
