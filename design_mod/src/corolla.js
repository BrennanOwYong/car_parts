import './corolla.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const $=id=>document.getElementById(id),viewport=$('viewport');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;viewport.prepend(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,80);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=18;controls.maxPolarAngle=Math.PI*.49;controls.target.set(0,.8,0);controls.autoRotateSpeed=.5;
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.03).texture;room.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xdde9ef,0x313e3d,1.5));
function light(color,power,pos){const l=new THREE.DirectionalLight(color,power);l.position.set(...pos);scene.add(l);return l;}
const key=light(0xfff2df,3,[3,8,5]);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.normalBias=.015;key.shadow.bias=-.0003;key.shadow.radius=4;
light(0xc7e5ff,2,[-5,4,-3]);light(0xffffff,1,[1,2,-6]);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.ShadowMaterial({opacity:.32}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;floor.receiveShadow=true;scene.add(floor);
const ring=new THREE.Mesh(new THREE.RingGeometry(3.4,3.407,180),new THREE.MeshBasicMaterial({color:0x809397,transparent:true,opacity:.2,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-.012;scene.add(ring);
const guideRoot=new THREE.Group();scene.add(guideRoot);
let groups=[],target=0,amount=0,selected=null,isolated=false,playing=false,direction=1,showGuides=true,ready=false;
const paint=[];const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function resetCamera(){const mobile=innerWidth<700;camera.position.set(mobile?8.4:5.8,mobile?4.7:3.4,mobile?10.2:7.4);controls.target.set(0,.8,0);camera.position.sub(controls.target).multiplyScalar(1+amount*.48).add(controls.target);controls.update();}
function resize(){const {width,height}=viewport.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;
 // Leave space for the inspector and title around the central product.
 camera.setViewOffset(width,height,innerWidth>1000?85:0,innerWidth<700?35:65,width,height);camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(viewport);resetCamera();
function offsetFor(name,center){const side=name.startsWith('Right')?1:-1;
 if(name.includes(' tire'))return new THREE.Vector3(side*2.15,.15,name.includes('front')?.3:-.3);
 if(name.includes(' wheel'))return new THREE.Vector3(side*1.52,.15,name.includes('front')?.3:-.3);
 if(name.includes(' brake'))return new THREE.Vector3(side*.9,.15,name.includes('front')?.3:-.3);
 if(name.includes('mirror'))return new THREE.Vector3(side*1.8,.65,.2);
 if(name.includes('glass'))return new THREE.Vector3(side*1.4,1.35,name.includes('front')?.25:-.25);
 if(name.includes('door'))return new THREE.Vector3(side*1.8,.05,name.includes('front')?.4:-.4);
 if(name.includes('fender'))return new THREE.Vector3(side*.8,.6,.85);
 if(name.includes('quarter'))return new THREE.Vector3(side*.85,.5,-.8);
 if(name.includes('rocker'))return new THREE.Vector3(side*1.15,.1,0);
 const map={'Roof panel':[0,1.7,0],Sunroof:[0,2.2,0],Hood:[0,1.15,.85],'Trunk lid':[0,1.15,-.85],Windshield:[0,1.65,.6],'Rear windshield':[0,1.65,-.9],'Front bumper':[0,.1,2.1],'Rear bumper':[0,.1,-2.1],'Front grille':[0,.2,2.55],'Rear lamps':[0,.8,-2.2],'Cabin interior':[0,.9,-.15],'Body structure':[0,.35,0],'Chassis & underbody':[0,-1.25,0]};
 if(name.includes('headlamp'))return new THREE.Vector3(side*.5,.9,1.8);
 return new THREE.Vector3(...(map[name]||[center.x*.6,.4,center.z*.5]));}
async function load(){try{
 const gltf=await new GLTFLoader().loadAsync('/assets/corolla-exploded.glb',e=>{if(e.total)$('progress').textContent=`${Math.round(e.loaded/e.total*100)}% · Loading geometry & materials`;});
 const car=gltf.scene;car.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(car),center=box.getCenter(new THREE.Vector3());
 const objects=[];car.traverse(o=>{if(o.isMesh)objects.push(o);});
 // Bake transforms so every assembly can move independently in metre-scale scene space.
 const grouped=new Map();
 for(const mesh of objects){let n=mesh;while(n.parent&&n.parent.name!=='Corolla'&&n.parent!==car)n=n.parent;const name=n.name.replace(/_/g,' ');if(!grouped.has(name)){const group=new THREE.Group();group.name=name;grouped.set(name,group);}mesh.geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);mesh.geometry.translate(-center.x,-box.min.y,-center.z);mesh.position.set(0,0,0);mesh.rotation.set(0,0,0);mesh.scale.setScalar(1);mesh.matrix.identity();mesh.material=mesh.material.clone();mesh.castShadow=true;mesh.receiveShadow=true;
  if(mesh.material.name==='Paint_Color'){const original=mesh.material;mesh.material=new THREE.MeshPhysicalMaterial({color:'#aeb6bd',metalness:.8,roughness:.24,clearcoat:1,clearcoatRoughness:.14,aoMap:original.aoMap});paint.push(mesh.material);}
  else{mesh.material.envMapIntensity=1.05;if(mesh.material.roughness<.08)mesh.material.roughness=.14;}
  grouped.get(name).add(mesh);
 }
 groups=[...grouped.values()];for(const [i,g]of groups.entries()){scene.add(g);g.userData.center=new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());g.userData.offset=offsetFor(g.name,g.userData.center);g.userData.index=i+1;
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([g.userData.center,g.userData.center]),new THREE.LineDashedMaterial({color:0xc4dfa3,transparent:true,opacity:.16,dashSize:.035,gapSize:.045}));guideRoot.add(line);g.userData.line=line;
 }
 $('loading').hidden=true;ready=true;window.corollaViewer={groups,get amount(){return amount;},renderer,scene,camera};$('visible-count').textContent=`${groups.length} / ${groups.length}`;
}catch(error){console.error(error);$('loading').innerHTML='<b>The Corolla could not load.</b><span>Reload the page to retry.</span>';}}
load();
function updateValue(value){target=value;$('explode').value=Math.round(value*100);$('explode').style.setProperty('--fill',`${value*100}%`);$('percent').innerHTML=`${String(Math.round(value*100)).padStart(3,'0')}<span>%</span>`;$('assembly-state').textContent=value<.01?'Assembled':value>.99?'Exploded':`Exploding · ${Math.round(value*100)}%`;}
$('explode').addEventListener('input',e=>{playing=false;$('play').textContent='▶';updateValue(+e.target.value/100);});
$('play').onclick=()=>{playing=!playing;if(playing)direction=target>.98?-1:1;$('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause animation':'Animate assembly');};
$('home').onclick=resetCamera;$('rotate').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('rotate').setAttribute('aria-pressed',controls.autoRotate);};$('guides').onclick=()=>{showGuides=!showGuides;$('guides').setAttribute('aria-pressed',showGuides);};
function select(group){selected=group;$('part-name').textContent=group?group.name:'Complete vehicle';$('part-index').textContent=group?String(group.userData.index).padStart(2,'0'):'ALL';$('part-detail').textContent=group?'Original textured geometry. Isolate this assembly to inspect it from every angle.':`Explore ${groups.length} visual assemblies. Select a part to inspect its original surface detail.`;$('isolate').disabled=!group;$('isolate').textContent=isolated?'Show complete vehicle ↗':'Isolate selected part ↗';}
function clearIsolation(){isolated=false;groups.forEach(g=>g.visible=true);$('clear').hidden=true;$('visible-count').textContent=`${groups.length} / ${groups.length}`;select(null);resetCamera();}
$('isolate').onclick=()=>{if(isolated){clearIsolation();return;}if(!selected)return;isolated=true;groups.forEach(g=>g.visible=g===selected);$('clear').hidden=false;$('visible-count').textContent=`1 / ${groups.length}`;controls.target.copy(selected.userData.center).add(selected.position);camera.position.copy(controls.target).add(new THREE.Vector3(3,2,3));select(selected);};$('clear').onclick=clearIsolation;
function pick(e){const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(mouse,camera);const hits=raycaster.intersectObjects(groups.filter(g=>g.visible),true);return hits[0]?.object.parent;}
let down;renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);renderer.domElement.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<5){const g=pick(e);if(g)select(g);else if(!isolated)select(null);}down=null;});renderer.domElement.addEventListener('pointermove',e=>{if(e.buttons)return;const g=pick(e);$('tag').hidden=!g;if(g){$('tag').textContent=g.name;const r=viewport.getBoundingClientRect();$('tag').style.left=`Math.min(e.clientX-r.left+15,r.width-170)}px`;$('tag').style.top=`${e.clientY-r.top+16}px`;}renderer.domElement.style.cursor=g?'pointer':'grab';});renderer.domElement.addEventListener('pointerleave',()=>$('tag').hidden=true);
for(const b of document.querySelectorAll('.swatch'))b.onclick=()=>{paint.forEach(m=>m.color.set(b.dataset.color));document.querySelectorAll('.swatch').forEach(s=>s.classList.toggle('selected',s===b));document.querySelector('aside .row b').textContent=b.dataset.name;};
$('capture').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.download=`corolla-${Math.round(amount*100)}-exploded.png`;a.href=renderer.domElement.toDataURL('image/png');a.click();};
let previous=0;renderer.setAnimationLoop(now=>{const dt=Math.min((now-previous)/1000,.05);previous=now;if(playing&&!isolated){updateValue(THREE.MathUtils.clamp(target+direction*dt*.17,0,1));if(target===0||target===1){playing=false;$('play').textContent='▶';}}
 const oldAmount=amount;amount=reduced?target:THREE.MathUtils.damp(amount,target,7,dt);if(!isolated){const ratio=(1+amount*.48)/(1+oldAmount*.48);camera.position.sub(controls.target).multiplyScalar(ratio).add(controls.target);}floor.position.y=-.015-amount*1.3;for(const g of groups){g.position.copy(g.userData.offset).multiplyScalar(amount);const line=g.userData.line;line.visible=showGuides&&amount>.05&&!isolated;const attr=line.geometry.attributes.position;attr.setXYZ(0,...g.userData.center.toArray());attr.setXYZ(1,...g.userData.center.clone().add(g.position).toArray());attr.needsUpdate=true;line.computeLineDistances();}
 controls.update();renderer.render(scene,camera);});
