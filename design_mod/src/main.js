import './style.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createPartGroup,disposeGroup} from '../geometry.mjs';

const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const state={screen:'home',region:'front',selections:{front:'stock',sides:'stock',rear:'stock'},compare:false,loaded:false,color:'#b7bec7'};
let catalog,renderer,scene,camera,controls,car,partRoot,environment,bodyMaterial,hoverRegion=null,flight=null;
const overlays={},hotspots={},thumbnails={},resultViews=[];
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const homeCamera=new THREE.Vector3(5.1,2.45,-5.8),homeTarget=new THREE.Vector3(0,.55,0);
const metal=new THREE.MeshPhysicalMaterial({color:0x303945,metalness:.65,roughness:.29,clearcoat:1});
let loadingPromise,resizeObserver;

// Subtle star field; the opening exploded-car animation remains a placeholder.
for(let i=0;i<100;i++){const star=document.createElement('i');star.style.left=`${(i*37.719)%100}%`;star.style.top=`${(i*61.331)%100}%`;star.style.opacity=String(.12+(i%5)*.09);$('stars').append(star);}

async function screen(name){
  if(state.screen===name)return;
  if(!reduced){document.body.classList.add('transitioning');await new Promise(r=>setTimeout(r,250));}
  for(const el of document.querySelectorAll('.screen'))el.hidden=el.id!==name;
  state.screen=name;window.scrollTo({top:0,behavior:'instant'});
  document.querySelector('.site-footer').hidden=name==='studio';
  if(name==='studio'){requestAnimationFrame(resize);if(state.loaded)flyTo(homeCamera,homeTarget);}
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
  const views={front:[new THREE.Vector3(3.5,1.5,-4.9),new THREE.Vector3(0,.45,-.65)],sides:[new THREE.Vector3(5.8,1.65,.4),new THREE.Vector3(0,.45,0)],rear:[new THREE.Vector3(3.6,1.9,4.9),new THREE.Vector3(0,.6,.7)]};
  flyTo(...views[id]);
}
function updateHighlights(){
  for(const [id,object] of Object.entries(overlays)){object.visible=!state.compare&&(id===hoverRegion);}
  for(const [id,el]of Object.entries(hotspots))el.classList.toggle('active',id===state.region);
}
function resize(){if(!renderer)return;const box=$('viewport').getBoundingClientRect();if(!box.width||!box.height)return;renderer.setSize(box.width,box.height);camera.aspect=box.width/box.height;camera.fov=THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(Math.PI/10)*1.65/camera.aspect)),36,64);camera.updateProjectionMatrix();}
function setupRenderer(){
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  $('viewport').append(renderer.domElement);
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(36,1,.05,100);camera.position.set(7.7,3.5,-8.5);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=3;controls.maxDistance=10;controls.maxPolarAngle=Math.PI*.485;controls.target.copy(homeTarget);controls.enablePan=false;
  controls.addEventListener('start',()=>{flight=null;});
  const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xe5eeff,0x232837,.6));
  const light=new THREE.DirectionalLight(0xe8efff,2);light.position.set(3,7,-3);scene.add(light);
  const rim=new THREE.DirectionalLight(0xc2d5ff,1);rim.position.set(-4,3,5);scene.add(rim);
  partRoot=new THREE.Group();scene.add(partRoot);
  const ground=new THREE.Mesh(new THREE.CircleGeometry(8,96),new THREE.MeshBasicMaterial({color:0x101319,transparent:true,opacity:.22}));ground.rotation.x=-Math.PI/2;ground.position.y=-.012;scene.add(ground);
  const ring=new THREE.Mesh(new THREE.RingGeometry(3.0,3.005,128),new THREE.MeshBasicMaterial({color:0x667386,transparent:true,opacity:.17,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-.008;scene.add(ring);
  resizeObserver=new ResizeObserver(resize);resizeObserver.observe($('viewport'));
  renderer.domElement.addEventListener('pointermove',hover);
  renderer.domElement.addEventListener('pointerleave',()=>{hoverRegion=null;$('tooltip').hidden=true;updateHighlights();});
  let down=null;renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
  renderer.domElement.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<5){const region=pick(e);if(region)focusRegion(region);}down=null;});
  for(const region of catalog.regions){const el=document.createElement('button');el.className='hotspot';el.setAttribute('aria-label',`Customize ${region.name}`);el.innerHTML=`<span>${region.name}</span>`;el.addEventListener('click',()=>focusRegion(region.id));el.hidden=true;$('viewport').append(el);hotspots[region.id]=el;}
  animate();
}
function bodyAncestor(mesh){for(let n=mesh;n;n=n.parent)if(n.name==='body')return true;return false;}
function regionAt(point){
  if(point.z< -1.60 && point.y<.64) return 'front';
  if(Math.abs(point.x)>.74 && point.y<.49 && point.z>-.9 && point.z<1.15)return 'sides';
  if(point.z>1.65 && point.y>.57 && point.y<1.10)return 'rear';
  return null;
}
function surfaceOverlays(){
  car.updateMatrixWorld(true);const triangles={front:[],sides:[],rear:[]};
  car.traverse(o=>{
    if(!o.isMesh||!bodyAncestor(o))return;o.userData.carBody=true;
    const a=o.geometry.attributes.position,idx=o.geometry.index,count=idx?idx.count:a.count;
    const p=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
    for(let i=0;i<count;i+=3){for(let j=0;j<3;j++)p[j].fromBufferAttribute(a,idx?idx.getX(i+j):i+j).applyMatrix4(o.matrixWorld);
      const center=p[0].clone().add(p[1]).add(p[2]).multiplyScalar(1/3),r=regionAt(center);if(r)for(const v of p)triangles[r].push(v.x,v.y,v.z);
    }
  });
  for(const [id,vertices]of Object.entries(triangles)){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
    const overlay=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0xa9c5eb,transparent:true,opacity:.4,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,side:THREE.DoubleSide}));overlay.visible=false;scene.add(overlay);overlays[id]=overlay;
  }
}
async function loadCar(){
  if(loadingPromise)return loadingPromise;
  loadingPromise=(async()=>{
    let draco;
    try {
      if(!renderer)setupRenderer();
      draco=new DRACOLoader();draco.setDecoderPath('/draco/');
      const loader=new GLTFLoader();loader.setDRACOLoader(draco);
      const gltf=await loader.loadAsync(catalog.vehicles[0].asset,e=>{if(e.total)$('load-detail').textContent=`${Math.round(e.loaded/e.total*100)}% · Preparing materials`;});
      car=gltf.scene;
      const box=new THREE.Box3().setFromObject(car),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
      const scale=catalog.vehicles[0].dimensions.length/1000/size.z;car.scale.setScalar(scale);car.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
      bodyMaterial=new THREE.MeshPhysicalMaterial({color:state.color,metalness:.85,roughness:.26,clearcoat:1,clearcoatRoughness:.12});
      const glass=new THREE.MeshPhysicalMaterial({color:0x161e2c,metalness:.45,roughness:.1,transparent:true,opacity:.9});
      car.traverse(o=>{if(!o.isMesh)return;if(bodyAncestor(o))o.material=bodyMaterial;
        if(o.name==='glass')o.material=glass;
        if(/leather|interior|carpet|plastic|carbon|grills|tire|wipers/.test(o.name))o.material=new THREE.MeshStandardMaterial({color:/tire|grills/.test(o.name)?0x0b0c10:0x181c23,metalness:/carbon/.test(o.name)?.45:0,roughness:/tire|leather/.test(o.name)?.85:.45});
        if(o.name==='trim')o.material=new THREE.MeshStandardMaterial({color:0x251820,roughness:.75});
        if(o.name.startsWith('rim_'))o.material=new THREE.MeshStandardMaterial({color:0x5b626c,metalness:1,roughness:.28});
        if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m.map)m.map.colorSpace=THREE.SRGBColorSpace;});}
      });
      scene.add(car);
      const ao=await new THREE.TextureLoader().loadAsync('/assets/ferrari_ao.png');
      const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.6,5.2),new THREE.MeshBasicMaterial({map:ao,blending:THREE.MultiplyBlending,toneMapped:false,transparent:true,premultipliedAlpha:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.003;scene.add(shadow);
      surfaceOverlays();state.loaded=true;$('loader').hidden=true;resize();buildThumbnails();renderOptions();rebuildParts();flyTo(homeCamera,homeTarget,1600);
      for(const el of Object.values(hotspots))el.hidden=false;
    }catch(error){console.error(error);$('loader').innerHTML='<p>The car couldn’t load.</p><small>Check the local asset files and try again.</small><button class="primary" id="retry-model">Try again ↻</button>';$('retry-model').onclick=()=>{loadingPromise=null;$('loader').innerHTML='<span class="loading-ring"></span><p>Loading your car</p><small id="load-detail"></small>';loadCar();};}
    finally{draco?.dispose();}
  })();return loadingPromise;
}
function pick(event){
  if(!state.loaded||state.compare)return null;
  const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects([car,partRoot],true)[0];
  if(!hit)return null;return hit.object.userData.region || (hit.object.userData.carBody?regionAt(hit.point):null);
}
function hover(event){
  hoverRegion=pick(event);renderer.domElement.style.cursor=hoverRegion?'pointer':'grab';
  const tooltip=$('tooltip');tooltip.hidden=!hoverRegion;
  if(hoverRegion){tooltip.textContent=`${catalog.regions.find(r=>r.id===hoverRegion).name} · Explore designs`;const rect=$('viewport').getBoundingClientRect();tooltip.style.left=`${Math.min(rect.width-180,event.clientX-rect.left+15)}px`;tooltip.style.top=`${event.clientY-rect.top+18}px`;}
  updateHighlights();
}
function animate(now=0){
  requestAnimationFrame(animate);
  if(state.screen==='studio'&&renderer){
    if(flight){const t=Math.min((now-flight.start)/flight.duration,1),ease=1-Math.pow(1-t,3);camera.position.lerpVectors(flight.from,flight.to,ease);controls.target.lerpVectors(flight.targetFrom,flight.targetTo,ease);if(t>=1)flight=null;}
    controls.update();renderer.render(scene,camera);
    if(state.loaded){const rect=$('viewport').getBoundingClientRect();for(const r of catalog.regions){const el=hotspots[r.id],anchor=new THREE.Vector3(...r.anchor);if(r.id==='sides')anchor.x=camera.position.x<0?-.99:.99;anchor.project(camera);el.hidden=state.compare||anchor.z>1||Math.abs(anchor.x)>.95||Math.abs(anchor.y)>.95;el.style.left=`${(anchor.x+1)/2*rect.width}px`;el.style.top=`${(-anchor.y+1)/2*rect.height}px`;}}
  }
  if(state.screen==='result'){for(const v of resultViews){if(!reduced)v.group.rotation.y+=.003;v.controls.update();v.renderer.render(v.scene,v.camera);}}
}
function buildThumbnails(){
  const r=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});r.setSize(240,140);r.setPixelRatio(1);r.toneMapping=THREE.ACESFilmicToneMapping;
  const s=new THREE.Scene();s.environment=environment.texture;s.add(new THREE.HemisphereLight(0xffffff,0x31405e,3));
  const cam=new THREE.PerspectiveCamera(35,240/140,.01,50);
  for(const region of catalog.regions)for(const style of catalog.styles){const group=createPartGroup(region.id,style.id,new THREE.MeshStandardMaterial({color:0xabb8ca,metalness:.65,roughness:.3}));
    const box=new THREE.Box3().setFromObject(group),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());group.position.sub(center);s.add(group);
    const length=Math.max(size.x,size.z);cam.position.set(length*.6,length*.75,length*.9);cam.lookAt(0,0,0);r.render(s,cam);thumbnails[`${region.id}-${style.id}`]=r.domElement.toDataURL();disposeGroup(group);
  }r.dispose();
}
function renderOptions(){
  if(!catalog)return;
  $('region-tabs').innerHTML=catalog.regions.map(r=>`<button class="${r.id===state.region?'active':''}" data-region="${r.id}" aria-pressed="${r.id===state.region}">${r.name}</button>`).join('');
  $('region-tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>focusRegion(b.dataset.region));
  const region=catalog.regions.find(r=>r.id===state.region);$('region-name').textContent=region.name;$('region-subtitle').textContent=region.subtitle;
  $('style-options').innerHTML=catalog.styles.map(style=>`<button class="style-card ${state.selections[state.region]===style.id?'selected':''}" data-style="${style.id}" aria-pressed="${state.selections[state.region]===style.id}" title="${style.description}"><img src="${thumbnails[`${state.region}-${style.id}`]||''}" alt="${style.name} ${region.name} preview"><span class="style-copy"><b>${style.name}</b><small>${style.tag}</small></span><span class="radio-dot"></span></button>`).join('')+`<button class="style-card stock-card ${state.selections[state.region]==='stock'?'selected':''}" data-style="stock" aria-pressed="${state.selections[state.region]==='stock'}"><span class="style-copy"><b>Original</b><small>KEEP IT STOCK</small></span><span class="radio-dot"></span></button>`;
  $('style-options').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.selections[state.region]=b.dataset.style;state.compare=false;updateCompare();rebuildParts();renderOptions();});
  const count=Object.values(state.selections).filter(s=>s!=='stock').length;$('selected-count').textContent=`${count} modification${count!==1?'s':''}`;$('export-button').disabled=!count||!state.loaded;
}
function rebuildParts(){if(!partRoot)return;for(const child of [...partRoot.children])disposeGroup(child);for(const [region,style]of Object.entries(state.selections))if(style!=='stock')partRoot.add(createPartGroup(region,style,metal));partRoot.visible=!state.compare;updateHighlights();}
function updateCompare(){if(partRoot)partRoot.visible=!state.compare;$('compare').setAttribute('aria-pressed',String(state.compare));$('compare').textContent=state.compare?'Return to your build':'Compare original';updateHighlights();}
function clearResultViews(){for(const v of resultViews){v.controls.dispose();v.renderer.dispose();v.observer.disconnect();disposeGroup(v.group);}resultViews.length=0;}
function partViewer(container,region,style,name){
  const r=new THREE.WebGLRenderer({antialias:true,alpha:true});r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.2;container.append(r.domElement);
  const s=new THREE.Scene();s.environment=environment.texture;s.add(new THREE.HemisphereLight(0xffffff,0x405370,3));
  const group=createPartGroup(region,style,new THREE.MeshStandardMaterial({color:0xb0bac9,metalness:.65,roughness:.3}));
  for(const child of [...group.children])if(!name.startsWith(child.name+'-')){child.geometry.dispose();group.remove(child);}
  const box=new THREE.Box3().setFromObject(group),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());group.position.sub(center);
  const wrapper=new THREE.Group();wrapper.add(group);s.add(wrapper);const length=Math.max(size.x,size.y,size.z);
  const cam=new THREE.PerspectiveCamera(35,1,.01,50);cam.position.set(length*.65,length*.85,length*1.05);cam.lookAt(0,0,0);
  const c=new OrbitControls(cam,r.domElement);c.enablePan=false;c.enableZoom=false;c.enableDamping=true;
  const observer=new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();if(width&&height){r.setSize(width,height);cam.aspect=width/height;cam.updateProjectionMatrix();}});observer.observe(container);
  resultViews.push({renderer:r,scene:s,camera:cam,group:wrapper,controls:c,observer});
}
async function exportKit(){
  const button=$('export-button');button.disabled=true;button.textContent='Preparing your parts…';$('export-error').hidden=true;
  try {
    const response=await fetch('/api/exports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vehicleId:catalog.vehicles[0].id,selections:state.selections})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Export failed.');
    clearResultViews();$('parts-layout').replaceChildren();$('download-kit').href=data.downloadUrl;
    for(const [i,part]of data.parts.entries()){
      const region=catalog.regions.find(r=>r.id===part.region),style=catalog.styles.find(s=>s.id===part.style);
      const side=part.name.includes('left')?' · Left':part.name.includes('right')?' · Right':'';
      const card=document.createElement('article');card.className='part-card';card.innerHTML=`<div class="part-top"><span>PART ${String(i+1).padStart(2,'0')}</span><span>${style.tag}</span></div><div class="part-view"></div><h3>${region.name}${side}</h3><p>${style.name} · ${part.dimensionsMm.join(' × ')} mm</p><a href="${part.url}" download>Download STL <span>↓</span></a>`;$('parts-layout').append(card);partViewer(card.querySelector('.part-view'),part.region,part.style,part.name);
    }
    await screen('result');
  }catch(error){$('export-error').textContent=error.message;$('export-error').hidden=false;}
  finally{button.innerHTML='Confirm and print <span>↗</span>';button.disabled=!state.loaded||!Object.values(state.selections).some(s=>s!=='stock');}
}
async function boot(){
  try{const response=await fetch('/api/catalog');if(!response.ok)throw new Error('Catalog unavailable. Start the studio with npm run dev.');catalog=await response.json();}
  catch(error){$('design-mode').disabled=true;$('design-mode').querySelector('p').textContent=error.message;return;}
  const v=catalog.vehicles[0];
  for(const [id,value]of [['make',v.make],['model',v.model],['year',v.year],['body-style',v.bodyStyle]]){$(id).replaceChildren(new Option(value,value));}
  $('year').parentElement.firstChild.textContent='Generation';
  document.querySelector('.available-note>span:nth-child(2)').innerHTML='Ferrari 458 is ready to explore.<br><small>More cars are joining the library.</small>';
  document.querySelector('.vehicle-title .eyebrow').textContent=`${v.make.toUpperCase()} / 458 SERIES`;
  document.querySelector('.vehicle-title h1').innerHTML='458<span>Make your mark.</span>';
  $('viewport').setAttribute('aria-label','Interactive Ferrari 458. Drag to orbit, scroll to zoom. Use the adjacent part buttons to select modifications.');
  const setup=()=>screen('setup');$('design-mode').onclick=setup;$('nav-studio').onclick=setup;
  $('home-link').onclick=e=>{e.preventDefault();screen('home');};document.querySelector('.back-home').onclick=()=>screen('home');$('change-car').onclick=setup;
  $('vehicle-form').onsubmit=async e=>{e.preventDefault();await screen('studio');await loadCar();};
  $('reset-camera').onclick=()=>flyTo(homeCamera,homeTarget);$('compare').onclick=()=>{state.compare=!state.compare;updateCompare();};
  $('export-button').onclick=exportKit;$('back-studio').onclick=$('edit-build').onclick=()=>screen('studio');
  document.querySelectorAll('.swatch').forEach(b=>b.onclick=()=>{state.color=b.dataset.color;if(bodyMaterial)bodyMaterial.color.set(state.color);$('finish-name').textContent=b.dataset.name;document.querySelectorAll('.swatch').forEach(el=>{el.classList.toggle('selected',el===b);el.setAttribute('aria-pressed',String(el===b));});});
}
boot();
