import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {applySavedVariants} from './part-variants.js';

// Three.js r180 camera and world-bounds contracts (checked 2026-09-13):
// https://raw.githubusercontent.com/mrdoob/three.js/r180/docs/api/en/cameras/PerspectiveCamera.html
// https://raw.githubusercontent.com/mrdoob/three.js/r180/docs/api/en/math/Box3.html
const DAMAGE_COLOR = new THREE.Color(0xff291f), DAMAGE_EMISSIVE = new THREE.Color(0xe01c10);
function frameBounds(camera, bounds, direction, horizontal = .88, vertical = .74, zoomRatio = 1, components = [bounds]) {
  const center = bounds.getCenter(new THREE.Vector3());
  direction.normalize();
  const right = new THREE.Vector3().crossVectors(camera.up, direction);
  if (right.lengthSq() < 1e-8) right.set(1, 0, 0); else right.normalize();
  const up = new THREE.Vector3().crossVectors(direction, right).normalize();
  const tangent = Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV()) / 2);
  let distance = 1;
  for (const component of components) for (const x of [component.min.x, component.max.x]) for (const y of [component.min.y, component.max.y]) for (const z of [component.min.z, component.max.z]) {
    const corner = new THREE.Vector3(x, y, z).sub(center), depth = corner.dot(direction);
    distance = Math.max(distance, depth + Math.abs(corner.dot(right)) / (tangent * camera.aspect * horizontal), depth + Math.abs(corner.dot(up)) / (tangent * vertical));
  }
  camera.position.copy(center).addScaledVector(direction, distance * zoomRatio);
  camera.far = Math.max(100, distance * zoomRatio + bounds.getSize(new THREE.Vector3()).length() * 3);
  camera.lookAt(center); camera.updateProjectionMatrix();
  return {center, distance};
}

function release(model) {
  const resources = new Set();
  model.traverse(o => {
    if (o.geometry) resources.add(o.geometry);
    for (const material of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
      resources.add(material); for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  resources.forEach(resource => resource.dispose()); model.removeFromParent();
}
async function load(asset) {
  const decoder = new DRACOLoader().setDecoderPath('/draco/');
  try {return (await new GLTFLoader().setDRACOLoader(decoder).loadAsync(asset)).scene;}
  finally {decoder.dispose();}
}
function lighting(renderer, scene) {
  const generator = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  scene.environment = generator.fromScene(room, .04).texture; room.dispose(); generator.dispose();
  scene.add(new THREE.HemisphereLight(0xeaf1ff, 0x303a4a, 2));
  const key = new THREE.DirectionalLight(0xf2f5ff, 3); key.position.set(4, 8, 5); scene.add(key);
}
export class RepairViewer {
  constructor(container, onSelect) {
    this.container = container; this.onSelect = onSelect; this.groups = new Map(); this.parts = []; this.target = .5; this.amount = .5; this.selected = null; this.isolated = false; this.damage = new Set(); this.version = 0; this.fitDistance = 0; this.assemblyBounds = new THREE.Box3(); this.currentBounds = []; this.refitPending = false;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true}); this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.append(this.renderer.domElement); this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(37, 1, .05, 100);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement); this.controls.enableDamping = !this.reduced.matches; this.controls.minDistance = .8; this.controls.maxDistance = 25;
    lighting(this.renderer, this.scene);
    this.outline = new THREE.Box3Helper(new THREE.Box3(), 0xb5c9e7); this.scene.add(this.outline); this.outline.visible = false;
    this.observer = new ResizeObserver(() => {const {width, height} = container.getBoundingClientRect(); if (width && height) {this.renderer.setSize(width, height); this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); this.fitViewport(true);}}); this.observer.observe(container);
    const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2(); let down;
    this.renderer.domElement.addEventListener('pointerdown', e => {down = [e.clientX, e.clientY];});
    this.renderer.domElement.addEventListener('pointercancel', () => {down = null;});
    this.renderer.domElement.addEventListener('pointerup', e => {
      if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) {
        const r = this.renderer.domElement.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); raycaster.setFromCamera(mouse, this.camera);
        let hit = raycaster.intersectObjects([...this.groups.values()].filter(g => g.visible), true)[0]?.object;
        while (hit && !hit.userData.repairPartId) hit = hit.parent;
        if (hit) this.select(hit.userData.repairPartId);
      } down = null;
    });
    let previous = 0;
    this.renderer.setAnimationLoop(now => {
      const dt = Math.min((now - previous) / 1000, .05); previous = now;
      this.amount = this.reduced.matches ? this.target : THREE.MathUtils.damp(this.amount, this.target, 8, dt);
      const pulse = this.reduced.matches ? .72 : .5 + .22 * Math.sin(now * .004);
      for (const part of this.parts) {
        const group = this.groups.get(part.id); if (!group) continue;
        group.position.fromArray(part.offsetMeters).multiplyScalar(this.amount);
        const damaged = this.damage.has(part.id);
        for (const material of group.userData.highlightMaterials) {
          const original = material.userData.original;
          if (material.color) {material.color.copy(original.color); if (damaged) material.color.lerp(DAMAGE_COLOR, pulse);}
          if (material.emissive) {
            material.emissive.copy(damaged ? DAMAGE_EMISSIVE : original.emissive);
            material.emissiveIntensity = damaged ? pulse : original.emissiveIntensity;
            if (!damaged && group.userData.edited) {material.emissive.setHex(0x328dc7); material.emissiveIntensity = pulse * .8;}
          }
        }
      }
      if (this.refitPending && this.model) {this.updateAssemblyBounds(); this.fitViewport(true); this.refitPending = Math.abs(this.amount - this.target) > .0005;}
      if (this.selected && this.groups.has(this.selected)) {
        this.outline.box.setFromObject(this.groups.get(this.selected)); this.outline.visible = true;
        if (this.isolated) {const center = this.outline.box.getCenter(new THREE.Vector3()); this.camera.position.add(center.clone().sub(this.controls.target)); this.controls.target.copy(center);}
      } else this.outline.visible = false;
      this.controls.update(); this.onFrame?.(); this.renderer.render(this.scene, this.camera);
    });
  }
  async open(manifest) {
    const version = ++this.version; this.clear(); this.parts = manifest.parts;
    const model = await load(manifest.asset);
    if (version !== this.version) {release(model); return false;}
    model.traverse(o => {if (o.userData.repairPartId) this.groups.set(o.userData.repairPartId, o);});
    if (manifest.parts.some(p => !this.groups.has(p.id))) {release(model); this.groups.clear(); throw new Error('Prepared geometry does not match its parts manifest.');}
    this.model = model;
    for (const group of this.groups.values()) {
      const materials = [];
      group.traverse(o => {
        if (!o.material) return;
        const clone = m => {const material = m.clone(); material.userData = {original: {color: material.color?.clone(), emissive: material.emissive?.clone(), emissiveIntensity: material.emissiveIntensity}}; materials.push(material); return material;};
        o.material = Array.isArray(o.material) ? o.material.map(clone) : clone(o.material);
      }); group.userData.highlightMaterials = materials;
    }
    for (const group of this.groups.values()) group.userData.assembledBounds = new THREE.Box3().setFromObject(group);
    applySavedVariants(model,manifest.vehicleId);
    this.amount = this.target;
    this.updateAssemblyBounds(); this.scene.add(model); this.reset(); return true;
  }
  clear() {if (this.model) release(this.model); this.model = null; this.groups.clear(); this.damage.clear(); this.selected = null; this.isolated = false; this.assemblyBounds.makeEmpty(); this.currentBounds = []; this.fitDistance = 0; this.refitPending = false;}
  close() {this.version++; this.clear(); this.parts = [];}
  setExplode(value) {this.target = THREE.MathUtils.clamp(value, 0, 1); this.refitPending = true;}
  setDamage(ids) {this.damage = new Set(ids.filter(id => this.groups.has(id)));}
  select(id) {if (!this.groups.has(id)) return; this.selected = id; if (this.isolated) this.isolate(true); this.onSelect(this.parts.find(p => p.id === id));}
  fitViewport(preserveZoom = false) {
    if (!this.model) return;
    const direction = this.camera.position.clone().sub(this.controls.target);
    if (direction.lengthSq() < 1e-8) direction.set(7.4, 3.5, 9.2);
    const ratio = preserveZoom && this.fitDistance ? Math.max(1, direction.length() / this.fitDistance) : 1;
    const bounds = this.isolated && this.selected ? new THREE.Box3().setFromObject(this.groups.get(this.selected)) : this.assemblyBounds;
    const {center, distance} = frameBounds(this.camera, bounds, direction, .90, .74, ratio, this.isolated ? [bounds] : this.currentBounds);
    this.fitDistance = distance; this.controls.target.copy(center); this.controls.maxDistance = Math.max(25, distance * 3); this.controls.update();
  }
  updateAssemblyBounds() {
    this.assemblyBounds.makeEmpty();
    this.currentBounds = this.parts.map(part => {
      const box = this.groups.get(part.id).userData.assembledBounds.clone().translate(new THREE.Vector3(...part.offsetMeters).multiplyScalar(this.amount));
      this.assemblyBounds.union(box); return box;
    });
  }
  reset() {this.isolated = false; this.groups.forEach(g => {g.visible = true;}); this.controls.target.set(0, 0, 0); this.camera.position.set(7.4, 3.5, 9.2); this.fitViewport();}
  isolate(force = false) {
    if (!this.selected) return; this.isolated = force || !this.isolated;
    this.groups.forEach((g, id) => {g.visible = !this.isolated || id === this.selected;});
    if (!this.isolated) {this.reset(); return;}
    this.fitViewport();
  }
}

// One world, floor and camera for the whole collection. Cars are spaced in metres,
// not placed inside per-car document elements or image slides.
export class Showroom {
  constructor(container, onSelect, onFocus) {
    this.container = container; this.onSelect = onSelect; this.onFocus = onFocus;
    this.entries = []; this.spacing = 4.8; this.position = 0; this.destination = 0; this.index = -1; this.active = true; this.lookY=.7; this.visibleWidth=10; this.needsRender=true;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2)); this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.shadowMap.autoUpdate=false;
    container.append(this.renderer.domElement);
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(36,1,.05,250);
    lighting(this.renderer,this.scene);
    const sun = new THREE.DirectionalLight(0xe7edf7,2); sun.position.set(4,9,4); sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-30,right:30,top:15,bottom:-15,near:.1,far:50}); sun.shadow.bias=-.00015; this.scene.add(sun);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(250,100),new THREE.ShadowMaterial({opacity:.28}));
    floor.rotation.x=-Math.PI/2; floor.position.y=-.015; floor.receiveShadow=true; this.scene.add(floor);
    this.raycaster=new THREE.Raycaster(); this.mouse=new THREE.Vector2();
    this.observer=new ResizeObserver(()=>this.resize()); this.observer.observe(container);
    let down=null;
    const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,position:this.destination};canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(down){this.pan(down.position-(e.clientX-down.x)*this.visibleWidth/container.clientWidth);}});
    canvas.addEventListener('pointerup',e=>{if(!down)return;const click=Math.hypot(e.clientX-down.x,e.clientY-down.y)<6;down=null;if(click){const rect=canvas.getBoundingClientRect();this.mouse.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);this.raycaster.setFromCamera(this.mouse,this.camera);let hit=this.raycaster.intersectObjects(this.entries.map(v=>v.model),true)[0]?.object;while(hit&&!hit.userData.vehicleId)hit=hit.parent;if(hit)this.onSelect(hit.userData.vehicleId);}else this.move(0);});
    canvas.addEventListener('pointercancel',()=>{down=null;this.move(0);});
    let wheelGesture=false, wheelEnd;
    container.addEventListener('wheel',e=>{e.preventDefault();const delta=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;if(!delta)return;if(!wheelGesture){wheelGesture=true;this.move(Math.sign(delta));}clearTimeout(wheelEnd);wheelEnd=setTimeout(()=>{wheelGesture=false;},180);},{passive:false});
    container.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();this.move(e.key==='ArrowLeft'?-1:1);}else if(e.key==='Enter'&&this.entries[this.index]){e.preventDefault();this.onSelect(this.entries[this.index].vehicle.id);}});
    let previous=0;
    this.renderer.setAnimationLoop(now=>{const dt=Math.min((now-previous)/1000,.05);previous=now;if(!this.active)return;const moving=Math.abs(this.position-this.destination)>.0001;const separating=this.repairEntry&&Math.abs(this.separation-.5)>.0001;if(!moving&&!separating&&!this.needsRender)return;this.position=this.reduced.matches?this.destination:THREE.MathUtils.damp(this.position,this.destination,7,dt);if(separating){this.separation=this.reduced.matches ? .5 : THREE.MathUtils.damp(this.separation,.5,7,dt);for(const part of this.repairEntry.vehicle.prepared.parts){const group=this.repairEntry.groups.get(part.id);if(group)group.position.fromArray(part.offsetMeters).multiplyScalar(this.separation);}this.renderer.shadowMap.needsUpdate=true;}this.camera.position.x=this.position;this.camera.lookAt(this.position,this.lookY,0);this.renderer.render(this.scene,this.camera);this.needsRender=false;});
  }
  async open(vehicles) {
    for(const vehicle of vehicles){const model=await load(vehicle.prepared.asset);applySavedVariants(model,vehicle.id);model.rotation.y=-.65;model.userData.vehicleId=vehicle.id;model.position.x=this.entries.length*this.spacing;const groups=new Map();model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}if(o.userData.repairPartId)groups.set(o.userData.repairPartId,o);});this.scene.add(model);this.entries.push({vehicle,model,groups});}
    this.renderer.shadowMap.needsUpdate=true;this.pan(0);this.resize();
  }
  resize(){const {width,height}=this.container.getBoundingClientRect();if(!width||!height)return;this.renderer.setSize(width,height);this.camera.aspect=width/height;
    if(this.entries.length){const first=this.entries[0].model,box=new THREE.Box3().setFromObject(first);const fitted=frameBounds(this.camera,box,new THREE.Vector3(0,2.7,8.5),.84,.78);this.lookY=fitted.center.y;this.camera.position.x=this.position;this.visibleWidth=2*Math.tan(THREE.MathUtils.degToRad(18))*this.camera.position.z*this.camera.aspect;}else{this.camera.position.set(0,3,9);this.lookY=.7;this.visibleWidth=10;}
    if(this.entries.length>1){this.camera.position.z=Math.max(this.camera.position.z,11.6/(2*Math.tan(THREE.MathUtils.degToRad(18))*this.camera.aspect));this.visibleWidth=2*Math.tan(THREE.MathUtils.degToRad(18))*this.camera.position.z*this.camera.aspect;}
    this.camera.updateProjectionMatrix();this.needsRender=true;
  }
  pan(value){this.destination=THREE.MathUtils.clamp(value,0,Math.max(0,(this.entries.length-1)*this.spacing));const index=Math.round(this.destination/this.spacing);if(index!==this.index&&this.entries[index]){this.index=index;this.onFocus(this.entries[index].vehicle,index,this.entries.length);}}
  move(delta){this.pan((Math.round(this.destination/this.spacing)+delta)*this.spacing);}
  startRepair(id){this.repairEntry=this.entries.find(e=>e.vehicle.id===id);this.separation=0;this.needsRender=true;this.entries.forEach(e=>{e.model.visible=e===this.repairEntry;});if(this.repairEntry)this.pan(this.entries.indexOf(this.repairEntry)*this.spacing);}
  setActive(active){this.active=active;if(active){this.repairEntry=null;this.separation=0;this.entries.forEach(e=>{e.model.visible=true;e.groups.forEach(g=>g.position.set(0,0,0));});this.renderer.shadowMap.needsUpdate=true;this.resize();}}
}

