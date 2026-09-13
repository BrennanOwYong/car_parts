import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {landingMotion, clamp01} from './landing-motion.mjs';

export function createLanding() {
  const home=document.getElementById('home');
  const scroll=document.getElementById('landing-scroll');
  const stage=scroll.querySelector('.landing-stage');
  const visual=document.getElementById('landing-visual');
  const mount=document.getElementById('landing-canvas');
  const opening=document.getElementById('landing-opening');
  const chapter=document.getElementById('landing-chapter');
  const modes=document.getElementById('modes');
  const cards=[...modes.querySelectorAll('.mode-card')];
  const cue=document.getElementById('landing-scroll-cue');
  const meta=document.getElementById('landing-meta');
  const load=document.getElementById('landing-load');
  const progressFill=document.getElementById('landing-progress-fill');
  const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
  let active=true, renderer, scene, camera, action, mixer, ready=false;
  let raw=0, smooth=0, previous=0, lastRendered=-1, needsResize=true;
  let width=1,height=1,scrollTop=0,travel=1,focusModes=false;
  const meshBounds=[];
  const bounds=new THREE.Box3(),center=new THREE.Vector3(),back=new THREE.Vector3();
  const right=new THREE.Vector3(),up=new THREE.Vector3(),point=new THREE.Vector3();
  const axis=new THREE.Vector3(0,1,0);let car, floor, failed=false;

  document.body.classList.add('landing-enhanced');
  modes.inert=true;
  modes.setAttribute('aria-hidden','true');
  const behavior=()=>motionPreference.matches?'instant':'smooth';
  function measure() {
    if(!active)return;
    width=stage.clientWidth;height=stage.clientHeight;
    scrollTop=scroll.getBoundingClientRect().top+window.scrollY;
    travel=Math.max(1,scroll.offsetHeight-height);
    needsResize=true;readScroll();
  }
  function readScroll(){raw=clamp01((window.scrollY-scrollTop)/travel);}
  function revealModes(event){event?.preventDefault();if(failed){modes.scrollIntoView({behavior:behavior()});return;}focusModes=true;window.scrollTo({top:scrollTop+travel*.96,behavior:behavior()});}
  function replay(){focusModes=false;window.scrollTo({top:scrollTop,behavior:behavior()});}
  cue.addEventListener('click',revealModes);
  document.getElementById('landing-replay').addEventListener('click',replay);
  window.addEventListener('scroll',readScroll,{passive:true});
  const observer=new ResizeObserver(measure);observer.observe(scroll);observer.observe(stage);
  window.addEventListener('resize',measure,{passive:true});
  motionPreference.addEventListener('change',()=>{measure();lastRendered=-1;});

  function updatePresentation(p) {
    const motion=landingMotion(p,motionPreference.matches);
    opening.style.opacity=motion.opening;
    opening.style.transform=`translateY(${-motion.turn*28}px)`;
    opening.style.visibility=motion.opening<.001?'hidden':'visible';
    chapter.style.opacity=motion.chapter;
    chapter.style.transform=`translateY(${(1-motion.chapter)*16}px)`;
    visual.style.filter=`blur(${motion.blur*18}px)`;
    visual.style.opacity=1-motion.blur*.57;
    modes.style.opacity=motion.reveal;
    modes.style.transform=`translateY(${(1-motion.reveal)*32}px)`;
    const revealed=motion.reveal>.85;
    modes.classList.toggle('is-revealed',revealed);
    modes.inert=!revealed;modes.setAttribute('aria-hidden',String(!revealed));
    for(const [i,card]of cards.entries()){
      const local=clamp01((motion.reveal-i*.09)/(1-i*.09));
      card.style.opacity=local;
      card.style.transform=`translateY(${(1-local)*35}px)`;
    }
    cue.style.opacity=motion.cue;cue.style.visibility=motion.cue<.01?'hidden':'visible';
    meta.style.opacity=1-motion.blur;
    progressFill.style.transform=`scaleX(${p})`;
    stage.dataset.phase=motion.reveal>.85?'modes':motion.explode>.98?'exploded':motion.explode>.01?'exploding':'assembled';
    if(revealed&&focusModes){document.getElementById('modes-title').focus({preventScroll:true});focusModes=false;}
    return motion;
  }
  function pose(motion) {
    action.time=action.getClip().duration*motion.explode;
    mixer.update(0);car.updateMatrixWorld(true);
    bounds.setFromObject(car);bounds.getCenter(center);
    const yaw=THREE.MathUtils.lerp(1.49,.67,motion.turn);
    const elevation=THREE.MathUtils.lerp(.075,.39,motion.turn);
    back.set(Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation));
    // A small camera roll gives the final formation the reference's floating tilt.
    axis.set(Math.sin(motion.turn*.025),Math.cos(motion.turn*.025),0);
    right.crossVectors(axis,back).normalize();up.crossVectors(back,right).normalize();
    const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanH=tanV*camera.aspect;
    const mobile=width<701;
    const fillW=mobile?.88:THREE.MathUtils.lerp(.62,.8,motion.turn);
    const fillH=mobile?.48:THREE.MathUtils.lerp(.59,.82,motion.turn);
    let distance=0;
    // Fit the full assembly across phone, laptop, and wide displays throughout the scroll.
    for(const mesh of meshBounds){
      const box=mesh.geometry.boundingBox;
      for(let i=0;i<8;i++){
        point.set(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).applyMatrix4(mesh.matrixWorld).sub(center);
        const depth=point.dot(back);
        distance=Math.max(distance,Math.abs(point.dot(right))/(tanH*fillW)+depth,Math.abs(point.dot(up))/(tanV*fillH)+depth);
      }
    }
    camera.position.copy(center).addScaledVector(back,distance);
    camera.up.copy(axis);camera.lookAt(center);
    floor.position.y=bounds.min.y-.015;
  }
  function frame(now) {
    if(!active||document.hidden)return;
    const dt=previous?Math.min((now-previous)/1000,.05):1/60;previous=now;
    smooth=motionPreference.matches?raw:THREE.MathUtils.damp(smooth,raw,8,dt);
    if(Math.abs(smooth-raw)<.00008)smooth=raw;
    if(needsResize&&renderer&&width&&height){
      renderer.setSize(width,height);camera.aspect=width/height;
      camera.setViewOffset(width,height,0,-height*(width<701?.015:.015),width,height);
      camera.updateProjectionMatrix();needsResize=false;lastRendered=-1;
    }
    if(Math.abs(lastRendered-smooth)<.00001)return;
    const motion=updatePresentation(smooth);
    if(ready){pose(motion);renderer.render(scene,camera);}
    lastRendered=smooth;
  }
  function startLoop(){previous=0;renderer?.setAnimationLoop(active&&!document.hidden?frame:null);}
  document.addEventListener('visibilitychange',startLoop);
  async function init() {
    try {
      renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(devicePixelRatio,width<701?1.5:2));
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute('aria-hidden','true');mount.append(renderer.domElement);
      scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(32,1,.1,100);
      const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
      const environment=pmrem.fromScene(room,.035);scene.environment=environment.texture;room.dispose();pmrem.dispose();
      scene.add(new THREE.HemisphereLight(0xd4e7ff,0x28333e,1.5));
      const key=new THREE.DirectionalLight(0xfff5e9,3);key.position.set(4,8,5);key.castShadow=true;
      key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-8,right:8,top:8,bottom:-8});key.shadow.normalBias=.015;key.shadow.bias=-.0003;key.shadow.radius=4;scene.add(key);
      const rim=new THREE.DirectionalLight(0xc3ddff,2.2);rim.position.set(-4,4,-3);scene.add(rim);
      const fill=new THREE.DirectionalLight(0xffffff,.8);fill.position.set(2,2,-5);scene.add(fill);
      floor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.ShadowMaterial({opacity:.2}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
      measure();startLoop();
      const gltf=await new GLTFLoader().loadAsync('/assets/corolla-exploded.glb');
      car=gltf.scene;
      car.traverse(mesh=>{
        if(!mesh.isMesh)return;
        mesh.castShadow=true;mesh.receiveShadow=true;mesh.geometry.computeBoundingBox();meshBounds.push(mesh);
        const original=mesh.material;
        if(original.name==='Paint_Color')mesh.material=new THREE.MeshPhysicalMaterial({color:0xb9c2cb,metalness:.8,roughness:.24,clearcoat:1,clearcoatRoughness:.14,aoMap:original.aoMap});
        else{mesh.material.envMapIntensity=1.05;if(mesh.material.roughness<.08)mesh.material.roughness=.14;}

      });
      scene.add(car);mixer=new THREE.AnimationMixer(car);
      const clip=gltf.animations.find(a=>a.name==='Assemble to Explode');
      if(!clip)throw new Error('The landing asset has no assembly animation.');
      action=mixer.clipAction(clip);action.play();action.paused=true;
      load.hidden=true;ready=true;lastRendered=-1;
      if(location.hash==='#modes')revealModes();
    }catch(error){
      failed=true;console.error('FORMA landing scene:',error);
      load.textContent='The 3D preview is unavailable. Explore the studio below.';
      renderer?.setAnimationLoop(null);document.body.classList.remove('landing-enhanced');
      modes.inert=false;modes.removeAttribute('aria-hidden');modes.removeAttribute('style');cards.forEach(card=>card.removeAttribute('style'));
    }
  }
  measure();init();
  return {
    replay,
    setActive(value){active=value;if(value){measure();smooth=raw;lastRendered=-1;}startLoop();},
  };
}
