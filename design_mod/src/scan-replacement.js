import * as THREE from 'three';
import {replacementMeshes, applyVariant, saveVariant, cadForMeshes, glbForMeshes, downloadFile} from './part-variants.js';
import {scanDevice, captureIPhoneDepth} from './iphone-depth.js';

// Browser capture and reconstruction remain demo adapters. The optional native
// iPhone adapter supplies real depth; reconstruction still uses the demo surface.
// Optional phone-photo capture: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture
export class DemoDepthCapture {
  async capture({vehicleId, partId, photo, signal}) {
    await delay(650,signal);
    return {vehicleId,partId,source:'simulated-depth',photoName:photo?.name||null,units:'mm'};
  }
}
export class DemoAstraReconstruction {
  async reconstruct(scan, {group,profile,signal}) {
    await delay(650,signal);
    // These constraints would be parsed from manufacturer/fitment documents
    // supplied by real mechanics when purchasing the corresponding car part.
    // The fixture checks a visual envelope only, never screw-hole fitment.
    const constraints={maximumEnvelopeChangeMm:25,documentSource:null};
    const meshes=replacementMeshes(group,profile);
    return {scan,meshes,profile,constraints,cad:cadForMeshes(meshes),mode:'demo'};
  }
}
function delay(ms,signal){return new Promise((resolve,reject)=>{if(signal.aborted)return reject(new Error('Scan cancelled'));const timer=setTimeout(resolve,ms);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new Error('Scan cancelled'));},{once:true});});}

export class ScanReplacement {
  constructor(getContext,onApply){
    this.getContext=getContext;this.onApply=onApply;
    this.dialog=document.createElement('dialog');this.dialog.className='scan-dialog';
    this.dialog.innerHTML=`<div class="scan-top"><div><span>SCAN TO PART · DEMO</span><h2 id="scan-title">Scan replacement</h2></div><button id="scan-close" aria-label="Close scanner">×</button></div><div class="scan-preview"><div id="scan-model"></div><img id="scan-photo" alt="Replacement reference photo" hidden><div class="scan-grid"></div><div class="scan-beam"></div></div><div class="scan-bottom"><p id="scan-status" role="status">Select a finish, then capture your replacement.</p><div class="scan-options"><label class="attach-button">Use phone camera<input id="scan-camera" type="file" accept="image/*" capture="environment"></label><select id="scan-profile" aria-label="Replacement style"><option value="sport">Sport · graphite</option><option value="touring">Touring · satin bronze</option></select></div><div id="scan-dimensions" hidden></div><div class="scan-actions"><button id="scan-start" class="primary">Start scan</button><button id="scan-cad" hidden>View CAD ↓</button><button id="scan-glb" hidden>3D preview ↓</button><button id="scan-apply" class="primary" hidden>Use this part ↗</button></div></div>`;
    this.dialog.setAttribute('aria-labelledby','scan-title');document.body.append(this.dialog);
    this.$=id=>this.dialog.querySelector('#'+id);
    this.phoneScan=document.createElement('button');this.phoneScan.id='scan-iphone';this.phoneScan.textContent='Scan with iPhone';
    this.dialog.querySelector('.scan-options').prepend(this.phoneScan);
    this.phoneScan.onclick=()=>{
      if(scanDevice().native)this.run(true);
      else {this.$('scan-status').textContent='Capture a camera reference. LiDAR scanning requires a native iPhone app.';this.$('scan-camera').click();}
    };
    this.$('scan-close').onclick=()=>this.close();this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
    this.$('scan-camera').onchange=e=>{this.photo=e.target.files[0];if(this.photoUrl)URL.revokeObjectURL(this.photoUrl);this.$('scan-photo').hidden=!this.photo;if(this.photo){this.photoUrl=URL.createObjectURL(this.photo);this.$('scan-photo').src=this.photoUrl;}};
    this.$('scan-start').onclick=()=>this.run();
    this.$('scan-cad').onclick=()=>downloadFile(this.result.cad,`${this.part.id}-custom.scad`,'text/plain');
    this.$('scan-glb').onclick=async()=>{try{downloadFile(await glbForMeshes(this.result.meshes),`${this.part.id}-custom.glb`);}catch(e){this.$('scan-status').textContent=e.message;}};
    this.$('scan-apply').onclick=()=>this.apply();
  }
  open(part){
    this.close();this.context=this.getContext();this.part=part;this.result=null;this.controller=new AbortController();
    this.$('scan-title').textContent=part.label;this.$('scan-status').textContent='Capture a reference or start the sample scan.';
    const device=scanDevice();this.phoneScan.hidden=!device.ios && !device.native;this.phoneScan.disabled=false;
    this.phoneScan.textContent=device.native?'Capture LiDAR depth':device.iphone?'Scan with iPhone':'Scan with iPad';
    if(device.ios)this.$('scan-status').textContent=device.native?'Point the rear camera at your replacement and capture LiDAR depth.':'Use your phone camera for a reference, or start the sample scan.';
    this.$('scan-start').hidden=false;this.$('scan-start').disabled=false;this.$('scan-profile').disabled=false;
    for(const id of ['scan-cad','scan-glb','scan-apply','scan-dimensions'])this.$(id).hidden=true;
    this.dialog.showModal();this.renderPreview(replacementMeshes(this.context.viewer.groups.get(part.id),this.$('scan-profile').value));
  }
  renderPreview(meshes){
    if(this.renderer){this.renderer.setAnimationLoop(null);this.renderer.dispose();}
    if(this.previewMeshes)this.previewMeshes.forEach(mesh=>{mesh.geometry.dispose();mesh.material.dispose();});
    this.previewMeshes=meshes;const host=this.$('scan-model');host.replaceChildren();
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setSize(host.clientWidth||560,280);host.append(this.renderer.domElement);
    const scene=new THREE.Scene(),group=new THREE.Group();meshes.forEach(mesh=>group.add(mesh));scene.add(group);
    const bounds=new THREE.Box3().setFromObject(group),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()).length();group.position.sub(center);
    const camera=new THREE.PerspectiveCamera(38,(host.clientWidth||560)/280,.001,100);camera.position.set(size*.8,size*.5,size*1.5);camera.lookAt(0,0,0);
    scene.add(new THREE.HemisphereLight(0xffffff,0x405060,3));const light=new THREE.DirectionalLight(0xffffff,4);light.position.set(2,3,4);scene.add(light);
    this.renderer.setAnimationLoop(t=>{group.rotation.y=Math.sin(t*.00025)*.22;this.renderer.render(scene,camera);});
  }
  async run(native=false){
    const signal=this.controller.signal;this.$('scan-start').disabled=true;this.$('scan-profile').disabled=true;this.dialog.classList.add('scanning');
    this.phoneScan.disabled=true;
    try {
      this.$('scan-status').textContent='Capturing surface…';
      const request={vehicleId:this.context.vehicle.id,partId:this.part.id,photo:this.photo,signal};
      const scan=native?await captureIPhoneDepth(request):await new DemoDepthCapture().capture(request);
      this.$('scan-status').textContent='Astra reconstruction · demo preview…';
      const result=await new DemoAstraReconstruction().reconstruct(scan,{group:this.context.viewer.groups.get(this.part.id),profile:this.$('scan-profile').value,signal});
      if(signal.aborted){result.meshes.forEach(m=>{m.geometry.dispose();m.material.dispose();});return;}
      this.result=result;this.renderPreview(result.meshes);this.dialog.classList.remove('scanning');
      this.$('scan-status').textContent='Replacement preview ready.';
      const maximumChange=result.profile==='sport'?18:7;
      this.$('scan-dimensions').textContent=`Profile change ≤ ${maximumChange} mm · Demo envelope ${result.constraints.maximumEnvelopeChangeMm} mm`;
      this.$('scan-dimensions').hidden=false;this.$('scan-start').hidden=true;
      for(const id of ['scan-cad','scan-glb','scan-apply'])this.$(id).hidden=false;
    } catch(e){if(!signal.aborted){this.$('scan-status').textContent=e.message;this.$('scan-start').disabled=false;this.$('scan-profile').disabled=false;this.phoneScan.disabled=false;this.dialog.classList.remove('scanning');}}
  }
  apply(){
    if(!this.result)return;const {viewer,vehicle,showroom}=this.context;
    const variant={profile:this.result.profile,version:1,source:'demo-scan',modifiedAt:new Date().toISOString()};
    saveVariant(vehicle.id,this.part.id,variant);applyVariant(viewer.groups.get(this.part.id),variant);
    viewer.updateAssemblyBounds();viewer.fitViewport();
    const entry=showroom.entries.find(e=>e.vehicle.id===vehicle.id),group=entry?.groups.get(this.part.id);
    if(group)applyVariant(group,variant);showroom.needsRender=true;showroom.renderer.shadowMap.needsUpdate=true;
    this.onApply(this.part,variant);this.close();
  }
  close(){
    this.controller?.abort();this.dialog.close();this.dialog.classList.remove('scanning');
    if(this.renderer){this.renderer.setAnimationLoop(null);this.renderer.dispose();this.renderer=null;}
    if(this.previewMeshes){this.previewMeshes.forEach(mesh=>{mesh.geometry.dispose();mesh.material.dispose();});this.previewMeshes=null;}
    if(this.photoUrl)URL.revokeObjectURL(this.photoUrl);this.photoUrl=null;this.photo=null;this.$('scan-photo').hidden=true;this.$('scan-camera').value='';
  }
}
