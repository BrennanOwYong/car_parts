import './style.css';
import './landing.css';
import {createLanding} from './landing.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createPartGroup,disposeGroup} from '../geometry.mjs';
import {prepareVehicle,updateExploded,modificationOffset,disposeObject} from '../vehicle-scene.mjs';
import {createCarLibrary,createExplodeControls} from './library.js';
import {attachHardware} from '../hardware.mjs';
import {createMountInspector,createMountingCard} from './mount-inspector.js';
import {assertCatalog} from '../catalog-contract.mjs';

const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const stock=()=>({front:'stock',sides:'stock',rear:'stock'});
const state={screen:'home',vehicleId:null,region:'front',selections:stock(),compare:false,loaded:false,color:'#b7bec7',explode:0,explodeTarget:0,exporting:false,hardware:true};
let catalog,library,exploder,mountCard,mountInspector,renderer,scene,camera,controls,car,model,partRoot,environment,floor,hoverRegion=null,flight=null;
const hotspots={},thumbnails={},resultViews=[],builds=new Map();
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const homeCamera=new THREE.Vector3(5.1,2.8,-5.8),homeTarget=new THREE.Vector3(0,.65,0);
const metal=new THREE.MeshPhysicalMaterial({color:0x303945,metalness:.65,roughness:.29,clearcoat:1});
let loadingPromise,resizeObserver,loadSequence=0,lastFrame=0;
const selectedVehicle=()=>catalog.vehicles.find(v=>v.id===state.vehicleId);
function framed(position){return position.clone().sub(homeTarget).multiplyScalar(1+state.explode*.56).add(homeTarget);}

const landing=createLanding();

// Ambient backdrop for the studio screens.
for(let i=0;i<100;i++){const star=document.createElement('i');star.style.left=`${(i*37.719)%100}%`;star.style.top=`${(i*61.331)%100}%`;star.style.opacity=String(.12+(i%5)*.09);$('stars').append(star);}

async function screen(name){
  if(state.screen===name)return;
  if(!reduced){document.body.classList.add('transitioning');await new Promise(r=>setTimeout(r,250));}
  for(const el of document.querySelectorAll('.screen'))el.hidden=el.id!==name;
  state.screen=name;document.body.dataset.screen=name;landing.setActive(name==='home');window.scrollTo({top:0,behavior:'instant'});
  document.querySelector('.site-footer').hidden=name==='studio';
  if(name==='studio'){requestAnimationFrame(resize);if(state.loaded)flyTo(framed(homeCamera),homeTarget);}
  document.body.classList.remove('transitioning');
}
function flyTo(position,target,duration=1000){
  if(!camera)return;
  if(reduced){camera.position.copy(position);controls.target.copy(target);controls.update();return;}
  flight={from:camera.position.clone(),to:position.clone(),targetFrom:controls.target.clone(),targetTo:target.clone(),start:performance.now(),duration};
}
function focusRegion(id){
  state.region=id;renderOptions();updateHighlights();
  if(!state.loaded)return;
  if(state.explode>.05){
    const target=regionAnchor(id).add(modificationOffset(id).multiplyScalar(state.explode));
    flyTo(target.clone().add(new THREE.Vector3(4.5,2.3,id==='rear'?4.8:-4.8)),target);return;
  }
  const views={front:[new THREE.Vector3(3.5,1.5,-4.9),new THREE.Vector3(0,.45,-.65)],sides:[new THREE.Vector3(5.8,1.65,.4),new THREE.Vector3(0,.45,0)],rear:[new THREE.Vector3(3.6,1.9,4.9),new THREE.Vector3(0,.6,.7)]};
  flyTo(...views[id]);
}
function updateHighlights(){
  if(model)for(const [id,objects] of Object.entries(model.overlays))for(const object of objects)object.visible=!state.compare&&(id===hoverRegion);
  for(const [id,el]of Object.entries(hotspots))el.classList.toggle('active',id===state.region);
}
function resize(){if(!renderer)return;const box=$('viewport').getBoundingClientRect();if(!box.width||!box.height)return;renderer.setSize(box.width,box.height);camera.aspect=box.width/box.height;camera.fov=THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(Math.PI/10)*1.65/camera.aspect)),36,64);camera.updateProjectionMatrix();}
function setupRenderer(){
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  $('viewport').append(renderer.domElement);
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(36,1,.05,100);camera.position.set(7.7,3.5,-8.5);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=3;controls.maxDistance=18;controls.maxPolarAngle=Math.PI*.485;controls.target.copy(homeTarget);controls.enablePan=false;
  controls.addEventListener('start',()=>{flight=null;});
  const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xe5eeff,0x232837,.6));
  const light=new THREE.DirectionalLight(0xe8efff,2);light.position.set(3,7,-3);scene.add(light);
  light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-7,right:7,top:7,bottom:-7});light.shadow.normalBias=.015;light.shadow.bias=-.0002;
  const rim=new THREE.DirectionalLight(0xc2d5ff,1);rim.position.set(-4,3,5);scene.add(rim);
  partRoot=new THREE.Group();scene.add(partRoot);
  floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.4}));floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;scene.add(floor);
  const ring=new THREE.Mesh(new THREE.RingGeometry(3.0,3.005,128),new THREE.MeshBasicMaterial({color:0x667386,transparent:true,opacity:.17,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-.008;scene.add(ring);
  resizeObserver=new ResizeObserver(resize);resizeObserver.observe($('viewport'));
  renderer.domElement.addEventListener('pointermove',hover);
  renderer.domElement.addEventListener('pointerleave',()=>{hoverRegion=null;$('tooltip').hidden=true;updateHighlights();});
  let down=null;renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
  renderer.domElement.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<5){const region=pick(e);if(region)focusRegion(region);}down=null;});
  for(const region of catalog.regions){const el=document.createElement('button');el.className='hotspot';el.setAttribute('aria-label',`Customize ${region.name}`);el.innerHTML=`<span>${region.name}</span>`;el.addEventListener('click',()=>focusRegion(region.id));el.hidden=true;$('viewport').append(el);hotspots[region.id]=el;}
  animate();
}
function regionAnchor(id,side=1){
  const original=catalog.regions.find(r=>r.id===id).anchor,{scale,offset}=selectedVehicle().kit[id];
  const anchor=new THREE.Vector3(...original).multiply(new THREE.Vector3(...scale)).add(new THREE.Vector3(...offset));
  if(id==='sides')anchor.x=Math.abs(anchor.x)*side;
  return anchor;
}
function setVehicleTitle(v){
  document.querySelector('.vehicle-title .eyebrow').textContent=`${v.make.toUpperCase()} / ${v.bodyStyle.toUpperCase()}`;
  const title=document.querySelector('.vehicle-title h1');title.replaceChildren(document.createTextNode(v.model));
  const subtitle=document.createElement('span');subtitle.textContent='Make your mark.';title.append(subtitle);
  $('viewport').setAttribute('aria-label',`Interactive ${v.make} ${v.model}. Drag to orbit, scroll to zoom. Explode the visual assemblies or choose a modification region.`);
  const source=document.querySelector('.view-source');source.replaceChildren(document.createTextNode('Model: '));
  const link=document.createElement('a');link.href=v.assetSource;link.textContent=v.attribution;link.target='_blank';link.rel='noopener';source.append(link,document.createTextNode(` · ${v.license}`));
}
function syncPaint(){
  model?.paint.forEach(m=>m.color.set(state.color));
  let name='Custom finish';document.querySelectorAll('.swatch').forEach(el=>{const active=el.dataset.color===state.color;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));if(active)name=el.dataset.name;});$('finish-name').textContent=name;
}
function clearCar(){
  if(model){disposeObject(model.overlayRoot,{textures:false});disposeObject(model.root);model=null;car=null;}
  for(const child of [...(partRoot?.children||[])])disposeGroup(child);
  for(const el of Object.values(hotspots))el.hidden=true;
  clearResultViews();$('parts-layout').replaceChildren();
}
async function loadCar(vehicleId){
  if(state.vehicleId===vehicleId&&state.loaded)return;
  if(state.vehicleId===vehicleId&&loadingPromise)return loadingPromise;
  const sequence=++loadSequence;
  if(state.vehicleId)builds.set(state.vehicleId,{selections:{...state.selections},color:state.color});
  state.vehicleId=vehicleId;state.selections={...(builds.get(vehicleId)?.selections||stock())};state.color=builds.get(vehicleId)?.color||'#b7bec7';
  state.loaded=false;state.compare=false;state.region='front';state.explode=0;hoverRegion=null;flight=null;
  exploder.set(0);exploder.ready(0);clearCar();for(const key of Object.keys(thumbnails))delete thumbnails[key];
  const vehicle=selectedVehicle();setVehicleTitle(vehicle);updateCompare();syncPaint();renderOptions();
  $('tooltip').hidden=true;$('loader').hidden=false;$('loader').innerHTML='<span class="loading-ring"></span><p>Bringing your car into focus.</p><small id="load-detail">Loading 3D model</small>';
  $('compare').disabled=$('reset-camera').disabled=true;
  loadingPromise=(async()=>{
    let draco;
    try {
      if(!renderer)setupRenderer();
      draco=new DRACOLoader();draco.setDecoderPath('/draco/');
      const loader=new GLTFLoader();loader.setDRACOLoader(draco);
      const gltf=await loader.loadAsync(vehicle.asset,e=>{if(sequence===loadSequence&&e.total&&$('load-detail'))$('load-detail').textContent=`${Math.round(e.loaded/e.total*100)}% · Preparing materials`;});
      if(sequence!==loadSequence){disposeObject(gltf.scene);return;}
      model=prepareVehicle(gltf.scene,vehicle,state.color);disposeObject(gltf.scene,{textures:false});
      car=model.root;scene.add(car,model.overlayRoot);
      state.loaded=true;$('loader').hidden=true;resize();buildThumbnails();renderOptions();rebuildParts();syncPaint();
      exploder.ready(model.assemblies.length);$('compare').disabled=$('reset-camera').disabled=false;
      camera.position.set(7.7,3.5,-8.5);controls.target.copy(homeTarget);flyTo(homeCamera,homeTarget,1600);
      for(const el of Object.values(hotspots))el.hidden=false;
    }catch(error){if(sequence!==loadSequence)return;console.error(error);state.loaded=false;clearCar();renderOptions();$('loader').innerHTML='<p>The car couldn’t load.</p><small>Check the local asset files and try again.</small><button class="primary" id="retry-model">Try again ↻</button>';$('retry-model').onclick=()=>loadCar(vehicleId);}
    finally{draco?.dispose();if(sequence===loadSequence)loadingPromise=null;}
  })();return loadingPromise;
}
function pick(event){
  if(!state.loaded||state.compare)return null;
  const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects([car,partRoot],true).find(h=>{for(let o=h.object;o;o=o.parent)if(!o.visible)return false;return true;});
  return hit?.object.userData.region||null;
}
function hover(event){
  hoverRegion=pick(event);renderer.domElement.style.cursor=hoverRegion?'pointer':'grab';
  const tooltip=$('tooltip');tooltip.hidden=!hoverRegion;
  if(hoverRegion){tooltip.textContent=`${catalog.regions.find(r=>r.id===hoverRegion).name} · Explore designs`;const rect=$('viewport').getBoundingClientRect();tooltip.style.left=`${Math.min(rect.width-180,event.clientX-rect.left+15)}px`;tooltip.style.top=`${event.clientY-rect.top+18}px`;}
  updateHighlights();
}
function animate(now=0){
  requestAnimationFrame(animate);
  const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;
  if(state.screen==='studio'&&renderer){
    if(flight){const t=Math.min((now-flight.start)/flight.duration,1),ease=1-Math.pow(1-t,3);camera.position.lerpVectors(flight.from,flight.to,ease);controls.target.lerpVectors(flight.targetFrom,flight.targetTo,ease);if(t>=1)flight=null;}
    if(state.loaded){
      const previous=state.explode;state.explode=reduced?state.explodeTarget:THREE.MathUtils.damp(state.explode,state.explodeTarget,7,dt);
      if(Math.abs(state.explode-state.explodeTarget)<.0001)state.explode=state.explodeTarget;
      if(!flight&&previous!==state.explode)camera.position.sub(controls.target).multiplyScalar((1+state.explode*.56)/(1+previous*.56)).add(controls.target);
      updateExploded(model,partRoot,state.explode);floor.position.y=-.012-state.explode*.82;floor.material.opacity=.4-state.explode*.22;
      const rect=$('viewport').getBoundingClientRect();for(const r of catalog.regions){const side=camera.position.x>=0?1:-1,el=hotspots[r.id],anchor=regionAnchor(r.id,side).add(modificationOffset(r.id,side).multiplyScalar(state.explode));anchor.project(camera);el.hidden=state.compare||anchor.z>1||Math.abs(anchor.x)>.95||Math.abs(anchor.y)>.95;el.style.left=`${(anchor.x+1)/2*rect.width}px`;el.style.top=`${(-anchor.y+1)/2*rect.height}px`;}
    }
    controls.update();renderer.render(scene,camera);
  }
  if(state.screen==='result'){for(const v of resultViews){if(!reduced)v.group.rotation.y+=.003;v.controls.update();v.renderer.render(v.scene,v.camera);}}
}
function buildThumbnails(){
  const r=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});r.setSize(240,140);r.setPixelRatio(1);r.toneMapping=THREE.ACESFilmicToneMapping;
  const s=new THREE.Scene();s.environment=environment.texture;s.add(new THREE.HemisphereLight(0xffffff,0x31405e,3));
  const cam=new THREE.PerspectiveCamera(35,240/140,.01,50);
  for(const region of catalog.regions)for(const style of catalog.styles){const group=createPartGroup(region.id,style.id,new THREE.MeshStandardMaterial({color:0xabb8ca,metalness:.65,roughness:.3}),state.vehicleId);
    const box=new THREE.Box3().setFromObject(group),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());group.position.sub(center);s.add(group);
    const length=Math.max(size.x,size.z);cam.position.set(length*.6,length*.75,length*.9);cam.lookAt(0,0,0);r.render(s,cam);thumbnails[`${region.id}-${style.id}`]=r.domElement.toDataURL();disposeObject(group,{textures:false});
  }r.dispose();
}
function renderOptions(){
  if(!catalog)return;
  $('region-tabs').innerHTML=catalog.regions.map(r=>`<button class="${r.id===state.region?'active':''}" data-region="${r.id}" aria-pressed="${r.id===state.region}">${r.name}</button>`).join('');
  $('region-tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>focusRegion(b.dataset.region));
  const region=catalog.regions.find(r=>r.id===state.region);$('region-name').textContent=region.name;$('region-subtitle').textContent=region.subtitle;
  $('style-options').innerHTML=catalog.styles.map(style=>`<button class="style-card ${state.selections[state.region]===style.id?'selected':''}" data-style="${style.id}" aria-pressed="${state.selections[state.region]===style.id}" ${!state.loaded?'disabled':''} title="${style.description}">${thumbnails[`${state.region}-${style.id}`]?`<img src="${thumbnails[`${state.region}-${style.id}`]}" alt="${style.name} ${region.name} preview">`:'<span class="thumbnail-placeholder"></span>'}<span class="style-copy"><b>${style.name}</b><small>${style.tag}</small></span><span class="radio-dot"></span></button>`).join('')+`<button class="style-card stock-card ${state.selections[state.region]==='stock'?'selected':''}" data-style="stock" aria-pressed="${state.selections[state.region]==='stock'}" ${!state.loaded?'disabled':''}><span class="style-copy"><b>Original</b><small>KEEP IT STOCK</small></span><span class="radio-dot"></span></button>`;
  $('style-options').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.selections[state.region]=b.dataset.style;state.compare=false;updateCompare();rebuildParts();renderOptions();});
  const count=Object.values(state.selections).filter(s=>s!=='stock').length;$('selected-count').textContent=`${count} modification${count!==1?'s':''}`;$('export-button').disabled=!count||!state.loaded||state.exporting;
  mountCard?.update(state.region,state.selections[state.region],state.loaded);
}
function rebuildParts(){if(!partRoot)return;for(const child of [...partRoot.children])disposeGroup(child);for(const [region,style]of Object.entries(state.selections))if(style!=='stock'){const group=createPartGroup(region,style,metal,state.vehicleId);attachHardware(group);partRoot.add(group);}setHardwareVisibility();partRoot.visible=!state.compare;if(model)updateExploded(model,partRoot,state.explode);updateHighlights();}
function setHardwareVisibility(){partRoot?.traverse(o=>{if(o.userData.hardware)o.visible=state.hardware;});}
function updateCompare(){if(partRoot)partRoot.visible=!state.compare;$('compare').setAttribute('aria-pressed',String(state.compare));$('compare').textContent=state.compare?'Return to your build':'Compare original';updateHighlights();}
function clearResultViews(){for(const v of resultViews){v.controls.dispose();v.renderer.dispose();v.observer.disconnect();disposeObject(v.group,{textures:false});}resultViews.length=0;}
function partViewer(container,region,style,name,vehicleId){
  const r=new THREE.WebGLRenderer({antialias:true,alpha:true});r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.2;container.append(r.domElement);
  const s=new THREE.Scene();s.environment=environment.texture;s.add(new THREE.HemisphereLight(0xffffff,0x405370,3));
  const group=createPartGroup(region,style,new THREE.MeshStandardMaterial({color:0xb0bac9,metalness:.65,roughness:.3}),vehicleId);
  for(const child of [...group.children])if(!name.startsWith(child.name+'-')){child.geometry.dispose();group.remove(child);}
  const box=new THREE.Box3().setFromObject(group),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());group.position.sub(center);
  const wrapper=new THREE.Group();wrapper.add(group);s.add(wrapper);const length=Math.max(size.x,size.y,size.z);
  const cam=new THREE.PerspectiveCamera(35,1,.01,50);cam.position.set(length*.65,length*.85,length*1.05);cam.lookAt(0,0,0);
  const c=new OrbitControls(cam,r.domElement);c.enablePan=false;c.enableZoom=false;c.enableDamping=true;
  const observer=new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();if(width&&height){r.setSize(width,height);cam.aspect=width/height;cam.updateProjectionMatrix();}});observer.observe(container);
  resultViews.push({renderer:r,scene:s,camera:cam,group:wrapper,controls:c,observer});
}
async function exportKit(){
  if(state.exporting||!state.loaded)return;
  state.exporting=true;const vehicleId=state.vehicleId,selections={...state.selections};
  const button=$('export-button');button.disabled=true;button.textContent='Preparing your parts…';$('export-error').hidden=true;
  try {
    const response=await fetch('/api/exports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vehicleId,selections})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Export failed.');
    if(vehicleId!==state.vehicleId||state.screen!=='studio')return;
    document.querySelector('.result-heading>.eyebrow').textContent=`${data.vehicleName.toUpperCase()} / YOUR KIT`;
    clearResultViews();$('parts-layout').replaceChildren();$('download-kit').href=data.downloadUrl;
    $('view-assembly-guide').href=data.guideUrl;$('download-bom').href=data.bomUrl;
    $('result-hardware-note').textContent=`${data.hardware.find(item=>item.id==='H1').quantity} illustrative bolted connections · Metal hardware is separate. The 7-page illustrated guide covers the bench demonstration; vehicle installation remains unverified.`;
    for(const [i,part]of data.parts.entries()){
      const region=catalog.regions.find(r=>r.id===part.region),style=catalog.styles.find(s=>s.id===part.style);
      const side=part.name.includes('left')?' · Left':part.name.includes('right')?' · Right':'';
      const card=document.createElement('article');card.className='part-card';card.innerHTML=`<div class="part-top"><span>PART ${String(i+1).padStart(2,'0')}</span><span>${style.tag}</span></div><div class="part-view"></div><h3>${region.name}${side}</h3><p>${style.name} · ${part.dimensionsMm.join(' × ')} mm</p><p class="part-mount-note">${part.mounting.holes.length} modeled clearance holes · pattern unverified</p><a href="${part.url}" download>Download STL <span>↓</span></a>`;$('parts-layout').append(card);partViewer(card.querySelector('.part-view'),part.region,part.style,part.name,vehicleId);
    }
    await screen('result');
  }catch(error){$('export-error').textContent=error.message;$('export-error').hidden=false;}
  finally{state.exporting=false;button.innerHTML='Confirm and print <span>↗</span>';button.disabled=!state.loaded||!Object.values(state.selections).some(s=>s!=='stock');}
}
async function boot(){
  try{const response=await fetch('/api/catalog',{cache:'no-store'});if(!response.ok)throw new Error('Catalog unavailable. Start the studio with npm run dev.');catalog=assertCatalog(await response.json());}
  catch(error){$('design-mode').disabled=true;$('nav-studio').disabled=true;const message=$('mode-error');message.className='error';message.setAttribute('role','alert');message.textContent=error.message;message.hidden=false;$('nav-studio').title=error.message;return;}
  library=createCarLibrary(catalog.vehicles,'ferrari-458-demo');
  exploder=createExplodeControls(value=>{state.explodeTarget=value;hoverRegion=null;$('tooltip').hidden=true;updateHighlights();});
  mountInspector=createMountInspector();
  mountCard=createMountingCard(()=>mountInspector.open(selectedVehicle(),state.region,state.selections[state.region],environment),visible=>{state.hardware=visible;setHardwareVisibility();});
  const links=document.createElement('div');links.className='result-guide-links';links.innerHTML='<a id="view-assembly-guide" target="_blank" rel="noopener">Illustrated assembly guide ↗</a><a id="download-bom" download>Hardware list ↓</a>';
  const note=document.createElement('p');note.id='result-hardware-note';note.className='result-hardware-note';document.querySelector('.result-note').after(links,note);
  const setup=()=>screen('setup');$('design-mode').onclick=setup;$('nav-studio').onclick=setup;
  $('home-link').onclick=e=>{e.preventDefault();if(state.screen==='home')landing.replay();else screen('home');};document.querySelector('.back-home').onclick=()=>screen('home');$('change-car').onclick=setup;
  $('vehicle-form').onsubmit=async e=>{e.preventDefault();const id=library.selected.id;await screen('studio');await loadCar(id);};
  $('reset-camera').onclick=()=>flyTo(framed(homeCamera),homeTarget);$('compare').onclick=()=>{state.compare=!state.compare;updateCompare();};
  $('export-button').onclick=exportKit;$('back-studio').onclick=$('edit-build').onclick=()=>screen('studio');
  document.querySelectorAll('.swatch').forEach(b=>b.onclick=()=>{state.color=b.dataset.color;syncPaint();});
}
boot();

$('learning-mode').addEventListener('click',()=>{location.href='/learning.html';});
