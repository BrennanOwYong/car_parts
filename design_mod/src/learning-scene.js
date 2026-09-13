import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {prepareVehicle,disposeObject} from '../vehicle-scene.mjs';
import {getCourse} from './learning-models.mjs';
import {createSourceStudy,sourceStats} from './learning-parts.mjs';
import {lessonForPart,introPose} from './learning-course.mjs';
export function createLearningScene(mount,{onReady=()=>{},onPick=()=>{},onIntroEnd=()=>{},onError=()=>{},onStudy=()=>{},course=getCourse(),preview=false}={}){
 const vehicle=course.vehicle;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.domElement.setAttribute('aria-label','Interactive 3D car. Drag to orbit; use the part buttons to open lessons.');mount.append(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.03,100),controls=new OrbitControls(camera,renderer.domElement);
 controls.enableDamping=true;controls.enablePan=false;controls.minDistance=.8;controls.maxDistance=19;controls.maxPolarAngle=Math.PI*.51;
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.025);scene.environment=environment.texture;room.dispose();pmrem.dispose();
 scene.add(new T.HemisphereLight(0xe5edff,0x1b2333,1.7));
 for(const [color,intensity,pos] of [[0xffeedb,2.8,[2,7,-4]],[0xc4ddff,2,[-5,3,2]],[0xffffff,1.4,[3,3,5]]]){const l=new T.DirectionalLight(color,intensity);l.position.set(...pos);if(pos[1]===7){l.castShadow=true;l.shadow.mapSize.set(2048,2048);Object.assign(l.shadow.camera,{left:-8,right:8,top:8,bottom:-8});l.shadow.normalBias=.02;l.shadow.bias=-.0002;}scene.add(l);}
 const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.ShadowMaterial({opacity:.3}));floor.rotation.x=-Math.PI/2;floor.position.y=-.025;floor.receiveShadow=true;scene.add(floor);
 const ring=new T.Mesh(new T.RingGeometry(3.15,3.157,128),new T.MeshBasicMaterial({color:0x8798b4,transparent:true,opacity:.2,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-.02;scene.add(ring);
 const tooltip=document.createElement('div');tooltip.className='model-tooltip';tooltip.hidden=true;mount.append(tooltip);
 const surfaceMaterials=new Map();
 let previewDrawn=false;let pendingStudy=null,viewDistance=5;let model,disposed=false,amount=0,target=0,mode='car',lab,lesson,chapter=0,value=50,intro=false,introStart=0,previous=0,hovered=null,fly=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const ray=new T.Raycaster(),pointer=new T.Vector2(),materials=new Map();
 function resize(){previewDrawn=false;const r=mount.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(mount);
 function home(){const narrow=mount.clientWidth<600;camera.position.set(narrow?7.5:5.7,narrow?3.7:2.7,narrow?-10:-7.2);controls.target.set(0,.65,0);if(preview)camera.position.sub(controls.target).multiplyScalar(.58).add(controls.target);controls.update();}
 home();resize();
 function highlight(group){if(hovered===group)return;for(const [m,c] of materials){m.emissive.copy(c.color);m.emissiveIntensity=c.intensity;}materials.clear();hovered=group;if(group)group.traverse(o=>{if(o.isMesh&&o.material.emissive){const m=o.material;if(!materials.has(m)){materials.set(m,{color:m.emissive.clone(),intensity:m.emissiveIntensity});m.emissive.set('#bcd4ff');m.emissiveIntensity=.25;}}});}
 function pick(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const roots=mode==='lab'?(lab?.children||[]):model?.assemblies.filter(g=>g.visible)||[];const hit=ray.intersectObjects(roots,true).find(h=>h.object.visible);if(!hit)return null;let o=hit.object;while(o.parent&&!roots.includes(o))o=o.parent;return roots.includes(o)?o:null;}
 let down=null;
 renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];fly=null;});
 renderer.domElement.addEventListener('pointermove',e=>{if(intro||preview||e.buttons)return;const g=pick(e);highlight(g);tooltip.hidden=!g;renderer.domElement.style.cursor=g?'pointer':'grab';if(g){tooltip.textContent=mode==='lab'?g.name:`${g.name} ↗`;const r=mount.getBoundingClientRect();tooltip.style.left=`${Math.max(8,Math.min(e.clientX-r.left+16,r.width-230))}px`;tooltip.style.top=`${Math.max(8,Math.min(e.clientY-r.top+16,r.height-60))}px`;}});
 renderer.domElement.addEventListener('pointerleave',()=>{highlight(null);tooltip.hidden=true;});
 renderer.domElement.addEventListener('pointerup',e=>{if(!intro&&!preview&&down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<5){const g=pick(e);if(g)onPick(mode==='lab'?g.userData.index:lessonForPart(g.name),g.name);}down=null;});
 const draco=new DRACOLoader();draco.setDecoderPath('/draco/');const loader=new GLTFLoader();loader.setDRACOLoader(draco);
 loader.loadAsync(vehicle.asset).then(gltf=>{if(disposed){disposeObject(gltf.scene);return;}model=prepareVehicle(gltf.scene,vehicle,course.color);model.assemblies.forEach(g=>g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();const m=o.material;if(vehicle.adapter==='ferrari'&&/metal_chrome|metal_gray/.test(m.name)){m.metalness=.96;m.roughness=m.name==='metal_chrome'?.19:.32;m.color.set('#9da5ae');}if(vehicle.adapter==='porsche'&&m.name==='rubber'){m.metalness=0;m.roughness=.83;}}}));scene.add(model.root);model.root.visible=mode==='car';disposeObject(gltf.scene,{textures:false});disposeObject(model.overlayRoot,{textures:false});if(pendingStudy)showStudy(...pendingStudy);onReady(model.assemblies.length);}).catch(e=>{if(!disposed)onError(e);}).finally(()=>draco.dispose());
 function frame(now){if(disposed||document.hidden||(preview&&previewDrawn))return;const dt=previous?Math.min((now-previous)/1000,.04):.016;previous=now;
 if(intro){const p=introPose((now-introStart)/1000);target=p.explode;const radius=(mount.clientWidth<600?12:9)*(1+p.explode*.45);camera.position.set(Math.sin(.65+p.angle)*radius,3+p.explode*2,-Math.cos(.65+p.angle)*radius);controls.target.set(0,.75+p.explode*.3,0);if(p.done){intro=false;controls.enabled=true;onIntroEnd();}}
 amount=reduced?target:T.MathUtils.damp(amount,target,7,dt);
 if(model&&mode==='car')for(const g of model.assemblies)g.position.copy(g.userData.offset).multiplyScalar(amount);
 if(fly){const p=Math.min(1,(now-fly.start)/700),s=p*p*(3-2*p);camera.position.lerpVectors(fly.from,fly.to,s);controls.target.lerpVectors(fly.targetFrom,fly.targetTo,s);if(p===1)fly=null;}
 if(mode==='lab'&&lab){
 for(const g of lab.children){g.position.copy(g.userData.base).addScaledVector(g.userData.offset,amount*.55);if(lesson.id==='wheels'&&chapter===1&&!reduced)g.rotation.x+=value/120*dt*.75;}
 }
 floor.visible=mode==='car';ring.visible=mode==='car';floor.position.y=-.025-amount*.85;
 controls.update();renderer.render(scene,camera);if(preview&&model)previewDrawn=true;}
 renderer.setAnimationLoop(frame);
 const visibility=()=>{previous=0;renderer.setAnimationLoop(document.hidden?null:frame);};document.addEventListener('visibilitychange',visibility);
 function restoreSurface(){highlight(null);for(const [mesh,material]of surfaceMaterials){mesh.material.dispose();mesh.material=material;}surfaceMaterials.clear();}
 function clearLab(){restoreSurface();highlight(null);tooltip.hidden=true;if(lab){disposeObject(lab,{textures:false});lab=null;}}
 function fit(root){
 const b=new T.Box3().setFromObject(root,true);if(b.isEmpty())return;
 const c=b.getCenter(new T.Vector3()),size=b.getSize(new T.Vector3());
 const fov=camera.fov*Math.PI/180;
 viewDistance=Math.max(size.length()*.8,Math.max(size.y,size.x/camera.aspect)/(2*Math.tan(fov/2)))*1.32;
 const direction=lesson?.id==='wheels'||lesson?.id==='brakes'?new T.Vector3(1,.25,.38):new T.Vector3(1,.65,-1.1);
 camera.position.copy(c).add(direction.normalize().multiplyScalar(viewDistance));controls.target.copy(c);controls.minDistance=Math.max(.12,viewDistance*.1);controls.maxDistance=Math.max(15,viewDistance*3);controls.update();
 }
 function showStudy(data,section=0){
 pendingStudy=[data,section];if(!model)return;
 clearLab();intro=false;controls.enabled=true;mode='lab';lesson=data;chapter=section;value=data.lab.value;target=0;amount=0;model.root.visible=false;
 lab=createSourceStudy(model,data.id);scene.add(lab);fit(lab);
 onStudy(lab.children.map(g=>g.name),sourceStats(lab));
 }
 return {
 intro(){if(!model)return;if(reduced){onIntroEnd();return;}intro=true;introStart=performance.now();controls.enabled=false;},
 skip(){intro=false;controls.enabled=true;target=0;home();onIntroEnd();},
 explode(v){target=v;},
 highlight(id){highlight(model?.assemblies.find(g=>lessonForPart(g.name)===id));},
 reset(){if(mode==='car')home();else if(lab)fit(lab);},
 car(){pendingStudy=null;clearLab();mode='car';target=0;amount=0;if(model){model.root.visible=true;model.assemblies.forEach(g=>g.visible=true);}home();},
 part(id){pendingStudy=null;clearLab();mode='car';target=0;amount=0;if(!model)return;model.root.visible=true;model.assemblies.forEach(g=>{g.visible=true;g.position.set(0,0,0);});home();highlight(model.assemblies.find(g=>lessonForPart(g.name)===id));},
 lab(data,section=0){showStudy(data,section);},
 surface(clay){restoreSurface();if(clay&&lab)lab.traverse(o=>{if(o.isMesh){surfaceMaterials.set(o,o.material);o.material=new T.MeshPhysicalMaterial({color:'#a6b2c0',metalness:.25,roughness:.32,clearcoat:.3,side:o.material.side});}});},
 setValue(v){value=v;},
 focus(index){if(!lab)return;const g=lab.children[index];if(!g)return;highlight(g);const c=new T.Box3().setFromObject(g).getCenter(new T.Vector3());fly={from:camera.position.clone(),to:c.clone().add(camera.position.clone().sub(controls.target).normalize().multiplyScalar(Math.max(new T.Box3().setFromObject(g,true).getSize(new T.Vector3()).length()*1.3,viewDistance*.3))),targetFrom:controls.target.clone(),targetTo:c,start:performance.now()};},
 dispose(){disposed=true;renderer.setAnimationLoop(null);document.removeEventListener('visibilitychange',visibility);observer.disconnect();controls.dispose();restoreSurface();highlight(null);disposeObject(scene);environment.dispose();renderer.dispose();renderer.domElement.remove();tooltip.remove();},
 get ready(){return !!model;}
 };
}