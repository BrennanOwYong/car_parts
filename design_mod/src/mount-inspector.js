import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createPartGroup} from '../geometry.mjs';
import {createFastener,explodeFastener} from '../hardware.mjs';
import './mounting.css';

// A capped local section makes the underside legible. Its hole diameter,
// thickness and surface slope come from the selected part; the outer cut faces
// are illustrative and never replace the full exported geometry.
function connectionSection(part,mount){
  const center=new THREE.Vector3(...mount.position),ray=new THREE.Raycaster();part.updateMatrixWorld(true);
  const yAt=(dx,dz)=>{ray.set(new THREE.Vector3(center.x+dx,center.y+.2,center.z+dz),new THREE.Vector3(0,-1,0));return ray.intersectObject(part)[0]?.point.y??center.y;};
  const base=yAt(.005,0),slopeX=(yAt(.007,0)-base)/.002,slopeZ=(yAt(.005,.002)-base)/.002;
  const shape=new THREE.Shape();shape.moveTo(-.023,-.019);shape.lineTo(.023,-.019);shape.lineTo(.023,.019);shape.lineTo(-.023,.019);shape.closePath();
  const hole=new THREE.Path();hole.absarc(0,0,.0033,0,Math.PI*2,true);shape.holes.push(hole);
  const depth=mount.thicknessMm/1000,g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:24});g.rotateX(-Math.PI/2);g.translate(0,-depth,0);
  const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+p.getX(i)*slopeX+p.getZ(i)*slopeZ);g.computeVertexNormals();return g;
}

export function createMountInspector(){
  const dialog=document.createElement('dialog');dialog.className='mount-dialog';dialog.setAttribute('aria-labelledby','mount-title');
  dialog.innerHTML='<div class="mount-dialog-top"><p class="eyebrow">DESIGNED TO CONNECT / CONCEPT STUDY</p><button id="close-mount" aria-label="Close connection inspector">×</button></div><h2 id="mount-title">The connection matters.</h2><p id="mount-caption"></p><div class="mount-detail-grid"><div><div id="mount-viewport" role="img" aria-label="Interactive close-up of an illustrative bolted attachment. Drag to orbit."></div><div class="mount-detail-control"><label for="hardware-explode">Fastener separation</label><input id="hardware-explode" type="range" min="0" max="100" value="55"><output id="hardware-percent">55%</output></div></div><div class="mount-stack"><p class="eyebrow">THE ASSEMBLY STACK</p><ol><li><span>01</span> Metal M6 bolt <small>Cosmetic thread illustration</small></li><li><span>02</span> Upper washer <small>Metal, purchased hardware</small></li><li><span>03</span> Your printed concept <small>Modeled Ø6.6 mm clearance hole</small></li><li><span>04</span> Isolation pad <small>Material specification pending</small></li><li><span>05</span> Metal backing plate <small>Illustrative load-spreading layer</small></li><li><span>06</span> Lower washer + locknut <small>Length, grade and torque pending</small></li></ol></div></div><div class="mount-warning"><b>VISUALIZATION ONLY · NOT A VEHICLE INSTALLATION DESIGN</b><p>These holes are not measured Ferrari, Toyota or Porsche mounting points. The car’s attachment substrate is not modeled here. Do not drill or install using this concept. Metal hardware is not included in printable STL files.</p></div>';
  document.body.append(dialog);let active=null;
  dialog.querySelector('#close-mount').onclick=()=>dialog.close();
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{
    if(!active)return;cancelAnimationFrame(active.frame);active.controls.dispose();active.observer.disconnect();active.renderer.dispose();
    active.scene.traverse(o=>o.geometry?.dispose());active.material.dispose();active.environment.dispose();active=null;dialog.querySelector('#mount-viewport').replaceChildren();
  });
  return {open(vehicle,region,style,environment){
    if(active)dialog.close();dialog.showModal();
    dialog.querySelector('#mount-caption').textContent=`${vehicle.make} ${vehicle.model} · ${region==='front'?'Front lip':region==='sides'?'Side skirt':'Rear spoiler'} · ${style} concept. Local cross-section; cut faces shown for clarity.`;
    const viewport=dialog.querySelector('#mount-viewport'),renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;viewport.append(renderer.domElement);
    const scene=new THREE.Scene(),pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),localEnvironment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();scene.environment=localEnvironment.texture;scene.add(new THREE.HemisphereLight(0xf0f4ff,0x263b51,2));
    const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(.1,.2,.1);scene.add(light);
    const material=new THREE.MeshPhysicalMaterial({color:0x3d526b,metalness:.35,roughness:.3,clearcoat:.5});
    const parts=createPartGroup(region,style,material,vehicle.id),part=parts.children[0];
    for(const other of [...parts.children])if(other!==part){other.geometry.dispose();parts.remove(other);}
    const mount=part.userData.mountPoints[0],center=new THREE.Vector3(...mount.position);
    const section=connectionSection(part,mount);part.geometry.dispose();part.geometry=section;part.position.copy(center);
    const root=new THREE.Group();root.add(parts);const hardware=createFastener(mount);root.add(hardware);root.position.sub(center);scene.add(root);
    const camera=new THREE.PerspectiveCamera(37,1,.0005,10);camera.position.set(.065,.035,.14);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=.045;controls.maxDistance=.3;controls.target.set(0,-.006,0);controls.update();
    const observer=new ResizeObserver(()=>{const box=viewport.getBoundingClientRect();if(!box.width||!box.height)return;renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();});observer.observe(viewport);
    const range=dialog.querySelector('#hardware-explode');range.value='55';
    const set=()=>{explodeFastener(hardware,Number(range.value)/100);dialog.querySelector('#hardware-percent').textContent=`${range.value}%`;};range.oninput=set;set();
    active={scene,renderer,controls,observer,material,environment:localEnvironment,frame:null};
    const render=()=>{if(!active||!dialog.open)return;controls.update();renderer.render(scene,camera);active.frame=requestAnimationFrame(render);};render();
  }};
}

export function createMountingCard(onInspect,onVisibility){
  const card=document.createElement('section');card.className='mounting-card';card.setAttribute('aria-label','Mounting concept');
  card.innerHTML='<div class="mounting-card-top"><span>BOLTED CONCEPT</span><span class="mount-state">FIT PENDING</span></div><p id="mount-summary">Select a design to explore its connection.</p><div><button id="inspect-mount" disabled>Inspect connection <span>↗</span></button><button id="hardware-toggle" aria-pressed="true" disabled title="Toggle illustrative metal fasteners">Hardware on</button></div>';
  document.querySelector('.finish-section').before(card);
  card.querySelector('#inspect-mount').onclick=onInspect;
  const toggle=card.querySelector('#hardware-toggle');toggle.onclick=()=>{const visible=toggle.getAttribute('aria-pressed')!=='true';toggle.setAttribute('aria-pressed',String(visible));toggle.textContent=visible?'Hardware on':'Hardware off';onVisibility(visible);};
  return {update(region,style,ready){const enabled=ready&&style!=='stock';card.querySelector('#inspect-mount').disabled=toggle.disabled=!enabled;card.querySelector('#mount-summary').textContent=enabled?`${region==='sides'?8:4} connection points · M6 hardware examples`:'Select a design to explore its connection.';}};
}
