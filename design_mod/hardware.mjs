import * as THREE from 'three';

export const mountingConcept={
  status:'illustrative-only',method:'Through-bolt with load-spreading plate',
  fastener:'M6 example; length, grade and torque not validated',
  clearanceDiameterMm:6.6,vehiclePatternVerified:false,roadUseApproved:false,
  note:'The holes are real geometry, but their locations are illustrative. Metal hardware is purchased, not 3D printed. Do not drill or install using this model.',
};
const steel=new THREE.MeshStandardMaterial({color:0xbcc7d4,metalness:.93,roughness:.26});
const darkSteel=new THREE.MeshStandardMaterial({color:0x576474,metalness:.85,roughness:.32});
const rubber=new THREE.MeshStandardMaterial({color:0x232932,roughness:.9});
const threadMaterial=new THREE.LineBasicMaterial({color:0xdce7f2});
function plate(width,length,depth,round=false){
  const shape=new THREE.Shape();
  if(round)shape.absarc(0,0,width/2,0,Math.PI*2,false);
  else{shape.moveTo(-width/2,-length/2);shape.lineTo(width/2,-length/2);shape.lineTo(width/2,length/2);shape.lineTo(-width/2,length/2);shape.closePath();}
  const hole=new THREE.Path();hole.absarc(0,0,.0033,0,Math.PI*2,true);shape.holes.push(hole);
  const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:16});g.rotateX(-Math.PI/2);return g;
}
function piece(group,name,g,material,y,step){const m=new THREE.Mesh(g,material);m.name=name;m.position.y=y;m.userData.restY=y;m.userData.explodeStep=step;m.userData.purchasedHardware=true;group.add(m);return m;}
export function createFastener(mount){
  const group=new THREE.Group();group.name='Illustrative metal connection';group.userData.hardware=true;group.position.set(...mount.position);
  const thickness=mount.thicknessMm/1000,shaftLength=Math.ceil((mount.thicknessMm+14)/5)*.005;
  const bolt=new THREE.Group();bolt.name='01 · Metal M6 bolt';bolt.userData.restY=.0016;bolt.userData.explodeStep=3;bolt.position.y=.0016;group.add(bolt);
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.0028,.0028,shaftLength,18),steel);shaft.position.y=-shaftLength/2;bolt.add(shaft);
  const head=new THREE.Mesh(new THREE.CylinderGeometry(.0058,.0058,.004,6),steel);head.position.y=.002;bolt.add(head);
  // Cosmetic thread helix only. It is not a manufacturing model of a fastener.
  const thread=[];const turns=shaftLength/.001;for(let i=0;i<=turns*12;i++){const t=i/12*Math.PI*2;thread.push(new THREE.Vector3(Math.cos(t)*.003,-i/12*.001,Math.sin(t)*.003));}
  bolt.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(thread),threadMaterial));
  piece(group,'02 · Upper metal washer',plate(.012,.012,.0016,true),steel,0,2);
  piece(group,'03 · Isolation pad',plate(.022,.022,.001,true),rubber,-thickness-.001,-1);
  piece(group,'04 · Metal backing plate',plate(.030,.020,.002),darkSteel,-thickness-.003,-2);
  piece(group,'05 · Lower metal washer',plate(.012,.012,.0016,true),steel,-thickness-.0046,-3);
  const nutShape=new THREE.Shape();for(let i=0;i<6;i++){const a=i/6*Math.PI*2;i?nutShape.lineTo(Math.cos(a)*.0058,Math.sin(a)*.0058):nutShape.moveTo(Math.cos(a)*.0058,Math.sin(a)*.0058);}nutShape.closePath();const hole=new THREE.Path();hole.absarc(0,0,.003,0,Math.PI*2,true);nutShape.holes.push(hole);
  const nut=new THREE.ExtrudeGeometry(nutShape,{depth:.005,bevelEnabled:false,curveSegments:12});nut.rotateX(-Math.PI/2);
  piece(group,'06 · Metal locknut (schematic)',nut,darkSteel,-thickness-.0096,-4);
  return group;
}
export function explodeFastener(group,amount){for(const m of group.children)m.position.y=m.userData.restY+m.userData.explodeStep*.01*amount;}
export function attachHardware(parts){
  for(const part of parts.children){
    const root=new THREE.Group();root.name='Mounting hardware';root.userData.hardware=true;
    for(const mount of part.userData.mountPoints||[])root.add(createFastener(mount));
    root.traverse(o=>{o.userData.region=parts.userData.region;});
    part.add(root);
  }
}
export function hardwareBOM(parts){
  const connections=parts.reduce((n,p)=>n+p.mounting.holes.length,0);
  return [
    {id:'H1',name:'M6 metal bolts — example only; length and grade TBD',quantity:connections,printable:false},
    {id:'H2',name:'Metal washers',quantity:connections*2,printable:false},
    {id:'H3',name:'Metal locking nuts — locking specification TBD',quantity:connections,printable:false},
    {id:'H4',name:'Load-spreading metal backing plates — illustrative 30 × 20 × 2 mm',quantity:connections,printable:false},
    {id:'H5',name:'Isolation pads — material and thickness TBD',quantity:connections,printable:false},
  ];
}
