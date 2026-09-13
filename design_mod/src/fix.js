import './fix.css';
import {RepairViewer, Showroom} from './fix-viewer.js';
import {ScanReplacement} from './scan-replacement.js';
import {cadForMeshes, downloadFile} from './part-variants.js';
import {evidenceFor, matchCadPart, saveEvidence, downloadEvidence, applyCadEvidence} from './cad-evidence.js';
import {Box3, Vector3} from 'three';

const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let vehicles = [], vehicle = null, viewer = null, busy = false, photos = [], messages = [], damage = [];
let photosChanged = false, hasReview = false, version = 0, preparingPhotos = false;
let entranceImage = null, showroom = null;
let savedLibrary = null;
const scanner = new ScanReplacement(()=>({vehicle,viewer,showroom}),(part)=>{
  addMessage('assistant',`Your custom ${part.label.toLowerCase()} is now on the car. Select it to view the CAD file or scan another replacement.`);
  viewer.select(part.id);
  renderPartCollection();
});
const scanButton=document.createElement('button');scanButton.id='scan-replacement';scanButton.textContent='Scan replacement ↗';
$('part-inspect').append(scanButton);scanButton.onclick=()=>{const part=viewer?.parts.find(p=>p.id===viewer.selected);if(part)scanner.open(part);};
const editAnnotation=document.createElement('button');editAnnotation.className='edit-annotation';editAnnotation.hidden=true;document.querySelector('.stage').append(editAnnotation);
editAnnotation.onclick=()=>{
  const group=annotationGroup();
  if(group?.userData.cadEvidence) downloadEvidence(group.userData.cadEvidence);
  else if(group?.userData.variantMeshes)downloadFile(cadForMeshes(group.userData.variantMeshes),`${group.userData.repairPartId}-custom.scad`,'text/plain');
};
function annotationGroup(){
  const selected=viewer?.groups.get(viewer.selected);
  return selected?.userData.edited ? selected : [...(viewer?.groups.values() || [])].find(group=>group.visible && group.userData.edited);
}
function positionEditAnnotation(){
  const group=annotationGroup();
  editAnnotation.hidden=!group?.userData.edited;if(editAnnotation.hidden)return;
  const point=new Box3().setFromObject(group).getCenter(new Vector3()).project(viewer.camera);
  const width=$('viewport').clientWidth,height=$('viewport').clientHeight;
  editAnnotation.style.left=`${Math.max(70,Math.min(width-210,(point.x+1)*width/2+45))}px`;
  editAnnotation.style.top=`${Math.max(100,Math.min(height-150,(1-point.y)*height/2-45))}px`;
  const part=viewer.parts.find(part=>part.id===group.userData.repairPartId);
  editAnnotation.textContent=`${part?.label || 'Part'} · Modified · View CAD ↗`;
}
const cadInput=document.createElement('input');cadInput.type='file';cadInput.accept='.scad,.step,.stp,.stl,.obj,.glb';cadInput.hidden=true;cadInput.id='cad-file';
const attachCad=document.createElement('button');attachCad.id='attach-cad';attachCad.textContent='Attach CAD ↗';attachCad.onclick=()=>cadInput.click();
const demoCad=document.createElement('button');demoCad.id='demo-cad';demoCad.textContent='Create demo CAD';
const cadStatus=document.createElement('span');cadStatus.id='cad-status';cadStatus.setAttribute('role','status');
$('part-inspect').append(attachCad,demoCad,cadInput,cadStatus);
const modifications=document.createElement('div');modifications.id='modified-parts';modifications.setAttribute('aria-label','Modified parts');
$('viewer-controls').prepend(modifications);
function renderPartCollection(){
  if(!viewer?.model)return;
  const entries=evidenceFor(vehicle.id);
  $('parts-list').replaceChildren(...viewer.parts.map(part=>{
    const button=document.createElement('button');button.className='part-row';button.dataset.id=part.id;
    const edited=viewer.groups.get(part.id)?.userData.edited;
    button.textContent=`${part.label}${edited?' · Modified':''}`;
    button.classList.toggle('modified',!!edited);button.setAttribute('aria-pressed',String(viewer.selected===part.id));
    button.onclick=()=>{viewer.reset();viewer.select(part.id);};return button;
  }));
  $('parts-list').parentElement.querySelector('summary').textContent=`${viewer.parts.length} individual parts`;
  modifications.replaceChildren(...viewer.parts.filter(part=>viewer.groups.get(part.id)?.userData.edited).map(part=>{
    const button=document.createElement('button');button.className='modification-record';button.dataset.partId=part.id;
    button.textContent=`${part.label} · Modified`;
    const filename=document.createElement('span');filename.textContent=entries[part.id]?.name || `${part.id}-custom.scad`;button.append(filename);
    button.onclick=()=>{viewer.reset();viewer.select(part.id);};return button;
  }));
}
function attachEvidence(part,file){
  saveEvidence(vehicle.id,part,file);
  applyCadEvidence(viewer.model,vehicle.id);
  const entry=showroom?.entries.find(entry=>entry.vehicle.id===vehicle.id);
  if(entry){applyCadEvidence(entry.model,vehicle.id);showroom.needsRender=true;}
  viewer.select(part.id);renderPartCollection();
  cadStatus.textContent=`${file.name} mapped to ${part.label}`;
}
cadInput.onchange=async()=>{
  const file=cadInput.files[0];cadInput.value='';if(!file)return;
  const current=version;
  try{
    if(!/\.(scad|step|stp|stl|obj|glb)$/i.test(file.name))throw new Error('Choose a CAD or 3D model file.');
    if(file.size>2_000_000)throw new Error('Choose a file under 2 MB for this demo.');
    const part=matchCadPart(file.name,viewer.parts);
    if(!part)throw new Error('Name the file after one part, such as front-bumper.step, then attach it again.');
    const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read this file.'));reader.readAsDataURL(file);});
    if(current!==version)return;
    attachEvidence(part,{name:file.name,dataUrl});
  }catch(e){if(current===version)cadStatus.textContent=e.message;}
};
demoCad.onclick=()=>{
  const part=viewer?.parts.find(part=>part.id===viewer.selected);if(!part)return;
  // A deliberately simple CAD fixture records a replacement by part name.
  // A future conversion worker supplies the replacement surface independently.
  const text=`// Demo replacement: ${part.label}\n// Units: millimetres. Placeholder geometry for the attachment workflow.\ncube([120,40,8],center=true);\n`;
  try{attachEvidence(part,{name:`${part.id}-custom.scad`,dataUrl:`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`});}
  catch(e){cadStatus.textContent=e.message;}
};
const libraryButton = document.createElement('button');
libraryButton.id = 'saved-parts'; libraryButton.textContent = 'Browse saved Corolla parts'; libraryButton.hidden = true;
document.querySelector('.damage-review').append(libraryButton);
libraryButton.onclick = async () => {
  const current = version; libraryButton.disabled = true;
  try {
    if (!savedLibrary) {const response = await fetch('/repair-assets/corolla-prepared-demo/repair-library.json'); if (!response.ok) throw new Error('The saved part library is unavailable.'); savedLibrary = await response.json();}
    if (current !== version) return;
    renderDownloads(savedLibrary.parts);
    $('repair-downloads').scrollIntoView({block:'nearest',behavior:'smooth'});
  } catch (e) {error(e.message);} finally {libraryButton.disabled = false;}
};

function beginEntrance(id) {
  if (entranceImage) restoreShowroomCanvas(entranceImage); entranceImage = null;
  const image = showroom?.renderer.domElement;
  if (!image || reduced) return;
  const rect = image.getBoundingClientRect();
  showroom.startRepair(id);
  entranceImage = image; entranceImage.className = 'car-entrance';
  Object.assign(entranceImage.style, {left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`});
  document.body.append(entranceImage); document.body.classList.add('repair-entering');
  // Commit the starting rectangle before applying the transition destination.
  image.getBoundingClientRect();
  requestAnimationFrame(() => {
    if (entranceImage !== image) return;
    const target = $('viewport').getBoundingClientRect();
    Object.assign(image.style, {left:`${target.left}px`,top:`${target.top}px`,width:`${target.width}px`,height:`${target.height}px`});
  });
}
async function finishEntrance(current) {
  viewer.setExplode(.5);
  const image = entranceImage;
  if (image) {
    await new Promise(resolve => setTimeout(resolve, 520));
  }
  if (current !== version) return;
  document.body.classList.remove('repair-entering');
  if (image) {image.style.opacity = '0'; setTimeout(() => {if (!entranceImage) restoreShowroomCanvas(image);}, 260);}
  entranceImage = null; if (!image) showroom?.setActive(false); viewer.setExplode(.5);
}

function error(message = '', global = false) {const box = $(global ? 'error' : 'chat-error'); box.textContent = message; box.hidden = !message;}
function addMessage(role, text) {
  const article = document.createElement('article'); article.className = `message ${role}`;
  const label = document.createElement('b'), body = document.createElement('p'); label.textContent = role === 'user' ? 'You' : 'Astra'; body.textContent = text; article.append(label, body);
  $('chat-log').append(article); $('chat-log').scrollTop = $('chat-log').scrollHeight; return article;
}
function updateControls() {
  const ready = !!viewer?.model && !vehicle?.repairNotice;
  $('send-message').disabled = busy || preparingPhotos || !ready || !photos.length || (!photosChanged && !$('message-input').value.trim()) || messages.length >= 39;
  $('confirm-repair').disabled = busy || preparingPhotos || messages.length >= 40 || !hasReview || photosChanged || !!$('message-input').value.trim() || !photos.length || !damage.length || damage.some(p => p.side === 'unknown');
  for (const id of ['damage-photos', 'message-input', 'change-car', 'new-review']) $(id).disabled = busy || preparingPhotos;
  document.querySelectorAll('.remove-photo,.remove-part').forEach(button => {button.disabled = busy || preparingPhotos;});
  $('working').hidden = !busy;
}
function renderDamage() {
  $('selected-count').textContent = damage.length;
  $('damage-selection').replaceChildren(...damage.map(part => {
    const chip = document.createElement('div'); chip.className = 'damage-chip'; chip.dataset.partId = part.id;
    const focus = document.createElement('button'); focus.className = 'chip-focus'; focus.textContent = part.partName; focus.disabled = !part.assemblyIds.length;
    const detail = document.createElement('small'); detail.textContent = part.assemblyIds.length ? `${Math.round(part.confidence * 100)}% confidence · ${part.damageDescription}` : `${part.side === 'unknown' ? 'Side needs clarification' : 'Surface not available in this model'} · ${part.damageDescription}`; focus.append(detail);
    focus.onclick = () => {viewer.reset(); viewer.select(part.assemblyIds[0]);};
    const remove = document.createElement('button'); remove.className = 'remove-part'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove ${part.partName}`);
    remove.onclick = () => {
      if (busy) return;
      damage = damage.filter(p => p.id !== part.id);
      const text = `Remove ${part.partName} from my repair selection.`;
      if (messages.length < 39) messages.push({role: 'user', text});
      addMessage('user', text); $('repair-downloads').hidden = true; renderDamage();
    };
    chip.append(focus, remove); return chip;
  }));
  viewer?.setDamage(damage.flatMap(p => p.assemblyIds)); updateControls();
}
function renderPhotos() {
  $('photos').replaceChildren(...photos.map(photo => {
    const div = document.createElement('div'); div.className = 'photo';
    const img = new Image(); img.src = photo.url; img.alt = photo.name;
    const button = document.createElement('button'); button.className = 'remove-photo'; button.textContent = '×'; button.setAttribute('aria-label', `Remove photo ${photo.name}`);
    button.onclick = () => {
      if (busy || preparingPhotos) return;
      photos = photos.filter(p => p.id !== photo.id); URL.revokeObjectURL(photo.url);
      photosChanged = true; hasReview = false; damage = []; $('repair-downloads').hidden = true;
      renderPhotos(); renderDamage();
    };
    div.append(img, button); return div;
  }));
  updateControls();
}
async function preparePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP image.');
  if (file.size > 20_000_000) throw new Error('Choose photos smaller than 20 MB each.');
  const bitmap = await createImageBitmap(file), canvas = document.createElement('canvas');
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height)); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d'); context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .82));
  if (!blob) throw new Error('This photo could not be prepared.');
  const bytes = new Uint8Array(await blob.arrayBuffer()); let encoded = '';
  for (let i = 0; i < bytes.length; i += 32768) encoded += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return {id: crypto.randomUUID(), name: file.name || 'Pasted photo', base64: btoa(encoded), url: URL.createObjectURL(blob)};
}
async function addPhotos(files) {
  if (busy || preparingPhotos || !vehicle) return;
  error(); if (photos.length + files.length > 6) return error('Keep up to six photos. Remove one before adding another.');
  preparingPhotos = true; updateControls(); const pending = [];
  try {
    for (const file of files) pending.push(await preparePhoto(file));
    photos.push(...pending); photosChanged = true; hasReview = false; $('repair-downloads').hidden = true; renderPhotos();
  } catch (e) {pending.forEach(p => URL.revokeObjectURL(p.url)); error(e.message);}
  finally {preparingPhotos = false; updateControls();}
}
function resetConversation() {
  photos.forEach(p => URL.revokeObjectURL(p.url)); photos = []; messages = []; damage = []; hasReview = false; photosChanged = false;
  $('message-input').value = ''; $('chat-log').replaceChildren(); $('repair-downloads').replaceChildren(); $('repair-downloads').hidden = true;
  error(); renderPhotos(); renderDamage();
  if (vehicle) addMessage('assistant', vehicle.repairNotice || `Let’s take a look at your ${vehicle.make} ${vehicle.model}. Add a damage photo and tell me what happened. We can review the hood, front bumper cover, front fenders, wheel-arch trim and mirror housings together.`);
}
function selectPart(part) {
  $('part-inspect').hidden = !part; if (!part) return;
  $('part-heading').textContent = part.label; $('isolate').textContent = viewer.isolated ? 'Show complete car' : 'Isolate part';
  scanButton.hidden = part.id === 'context';
  cadStatus.textContent=viewer.groups.get(part.id)?.userData.cadEvidence?.name || '';
  document.querySelectorAll('.part-row').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === part.id));
}
async function chooseVehicle(id) {
  if (busy) return;
  const next = vehicles.find(v => v.id === id); if (!next?.prepared) return;
  beginEntrance(id);
  document.body.classList.remove('showroom-open');
  const current = ++version; vehicle = next;
  libraryButton.hidden = vehicle.id !== 'corolla-prepared-demo';
  $('car-picker').hidden = true; $('repair-workspace').hidden = false; $('empty-state').hidden = false; $('retry-load').hidden = true; $('viewer-controls').hidden = true; $('part-inspect').hidden = true;
  window.scrollTo({top: 0, behavior: 'instant'});
  $('empty-title').textContent = 'Loading your car'; $('empty-description').textContent = 'Bringing its surfaces into focus.';
  $('vehicle-title').textContent = `${vehicle.make} ${vehicle.model}${vehicle.model_years === 'unknown' ? '' : ` · ${vehicle.model_years}`}`;
  $('explode').value = '50'; $('explode-value').textContent = '50%'; $('assembly-state').textContent = 'Separated 50%';
  history.replaceState(null, '', `/fix.html?vehicle=${encodeURIComponent(id)}`); resetConversation();
  try {
    viewer ||= new RepairViewer($('viewport'), selectPart); viewer.onFrame=positionEditAnnotation; viewer.setExplode(0); viewer.amount = 0;
    const loaded = await viewer.open(vehicle.prepared); if (!loaded || current !== version) return;
    $('empty-state').hidden = true; $('viewer-controls').hidden = false;
    renderPartCollection();
    await finishEntrance(current); updateControls();
  } catch (e) {if (current !== version) return; if (entranceImage) restoreShowroomCanvas(entranceImage); entranceImage = null; document.body.classList.remove('repair-entering'); error(e.message); $('empty-title').textContent = 'The model could not load.'; $('empty-description').textContent = 'Retry loading the prepared asset.'; $('retry-load').hidden = false; updateControls();}
}
async function askAstra(generate = false) {
  if (busy || preparingPhotos || !photos.length || !vehicle) return;
  if (generate && $('confirm-repair').disabled) return;
  if (!generate && $('send-message').disabled) return;
  error(); busy = true; updateControls();
  const text = generate ? 'I confirm these selected parts. Generate their fitted and exploded visual concepts.' : $('message-input').value.trim() || 'Review the attached damage photos and update the replacement candidates.';
  const userEntry = addMessage('user', text);
  if (!generate) {
    const attachments = document.createElement('div'); attachments.className = 'message-photos';
    for (const photo of photos) {const img = new Image(); img.src = `data:image/jpeg;base64,${photo.base64}`; img.alt = photo.name; attachments.append(img);}
    userEntry.append(attachments);
  }
  const pending = addMessage('assistant', generate ? 'Retrieving saved parts…' : 'Reviewing your damage photos…');
  pending.classList.add('pending'); $('chat-log').setAttribute('aria-busy','true');
  const started = Date.now();
  const clock = setInterval(() => {pending.querySelector('p').textContent = `${generate ? 'Retrieving saved parts' : 'Reviewing your damage photos'}… ${Math.floor((Date.now()-started)/1000)}s`;},1000);
  $('working').textContent = generate ? 'Astra is generating the confirmed concepts…' : 'Astra is reviewing the photos and updating the highlighted parts…';
  const outgoing = [...messages, {role: 'user', text}];
  try {
    const body = JSON.stringify({phase: generate ? 'repair_chat_generate' : 'repair_chat', vehicle_asset_id: vehicle.id, images_base64: photos.map(p => p.base64), messages: outgoing, selected_damage_parts: damage});
    if (new Blob([body]).size > 4_000_000) throw new Error('These photos are too large to send together. Remove a photo and retry.');
    const response = await fetch('/api/repair/chat', {method: 'POST', headers: {'Content-Type': 'application/json'}, body});
    const result = await response.json().catch(() => ({error: response.status === 413 ? 'These photos are too large to send together. Remove a photo and retry.' : 'Astra could not complete this review. Please retry.'})); if (!response.ok) throw new Error(result.error || 'Astra could not complete this review.');
    if (result.vehicleAssetId !== vehicle.id) throw new Error('The reply belongs to a different car. Please retry.');
    if ((!generate && (result.outcome !== 'damage_review' || !Array.isArray(result.damageParts))) || (generate && (result.outcome !== 'repair_cad_ready' || !Array.isArray(result.repairCad)))) throw new Error('Astra returned an incomplete result. Please retry.');
    messages = [...outgoing, {role: 'assistant', text: result.userMessage}]; addMessage('assistant', result.userMessage);
    $('message-input').value = ''; photosChanged = false;
    if (generate) renderDownloads(result.repairCad);
    else {damage = result.damageParts; hasReview = true; $('repair-downloads').hidden = true; renderDamage();}
  } catch (e) {userEntry.remove(); error(e.message);}
  finally {clearInterval(clock); pending.remove(); $('chat-log').setAttribute('aria-busy','false'); busy = false; updateControls();}
}
function download(content, filename) {const url = URL.createObjectURL(new Blob([content], {type: 'text/plain'})); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);}
function renderDownloads(parts) {
  $('repair-downloads').replaceChildren(...parts.map(part => {
    const card = document.createElement('section'); card.className = 'download-card'; const heading = document.createElement('h3'); heading.textContent = part.partName; card.append(heading);
    if (part.diagramSvg) {
      const image = new Image(); image.alt = `${part.partName} reference diagram`;
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(part.diagramSvg)}`; card.append(image);
      const drawing = document.createElement('button'); drawing.textContent = 'Reference diagram ↓'; drawing.onclick = () => download(part.diagramSvg, `${part.id}-reference.svg`); card.append(drawing);
    }
    for (const [label, field, suffix] of [['Fitted concept ↓', 'cadPayload', 'fitted'], ['Exploded concept ↓', 'explodedCadPayload', 'exploded']]) {const b = document.createElement('button'); b.textContent = label; b.onclick = () => download(part[field], `${part.id}-${suffix}.scad`); card.append(b);} return card;
  })); $('repair-downloads').hidden = false;
}
$('send-message').onclick = () => askAstra(); $('confirm-repair').onclick = () => askAstra(true);
$('message-input').oninput = updateControls; $('message-input').onkeydown = e => {if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {e.preventDefault(); askAstra();}};
$('damage-photos').onchange = async e => {await addPhotos([...e.target.files]); e.target.value = '';};
document.addEventListener('paste', async e => {
  if (!vehicle || $('repair-workspace').hidden) return;
  const clipboard = e.clipboardData;
  const items = [...(clipboard?.items || [])].filter(item => item.kind === 'file' && item.type.startsWith('image/')).map(item => item.getAsFile()).filter(Boolean);
  const files = items.length ? items : [...(clipboard?.files || [])].filter(file => file.type.startsWith('image/'));
  if (!files.length) return;
  e.preventDefault();
  if (busy || preparingPhotos) return error('Wait for the current step to finish, then paste your photo again.');
  await addPhotos(files);
  $('message-input').focus();
});
$('explode').oninput = e => {viewer?.setExplode(Number(e.target.value) / 100); $('explode-value').textContent = `${e.target.value}%`; $('assembly-state').textContent = e.target.value === '0' ? 'Assembled' : e.target.value === '100' ? 'Exploded' : `Separated ${e.target.value}%`;};
$('reset-view').onclick = () => {viewer?.reset(); $('isolate').textContent = 'Isolate part';};
$('isolate').onclick = () => {viewer?.isolate(); $('isolate').textContent = viewer.isolated ? 'Show complete car' : 'Isolate part';};
$('retry-load').onclick = () => chooseVehicle(vehicle.id); $('new-review').onclick = () => {if (!busy) resetConversation();};
$('change-car').onclick = () => {if (busy || preparingPhotos) return; version++; if (entranceImage) restoreShowroomCanvas(entranceImage); entranceImage = null; document.body.classList.remove('repair-entering'); document.body.classList.add('showroom-open'); viewer?.close(); vehicle = null; resetConversation(); $('repair-workspace').hidden = true; $('car-picker').hidden = false; showroom?.setActive(true); window.scrollTo({top:0,behavior:'instant'}); history.replaceState(null, '', '/fix.html');};
function restoreShowroomCanvas(canvas) {canvas.className=''; canvas.removeAttribute('style'); $('vehicle-list').append(canvas); showroom?.setActive(document.body.classList.contains('showroom-open'));}
async function start() {
  try {
    const response=await fetch('/api/repair/catalog'); if(!response.ok)throw new Error('The vehicle library could not load.');
    ({vehicles}=await response.json()); const available=vehicles.filter(v=>v.prepared);
    showroom=new Showroom($('vehicle-list'),chooseVehicle,(v,index,count)=>{
      $('showroom-name').textContent=`${v.make} ${v.model}${v.model_years==='unknown'?'':` · ${v.model_years}`}`;
      $('vehicle-list').setAttribute('aria-label',`Select ${v.make} ${v.model}`);
      $('showroom-previous').disabled=index===0; $('showroom-next').disabled=index===count-1;
    });
    $('showroom-previous').onclick=()=>showroom.move(-1); $('showroom-next').onclick=()=>showroom.move(1);
    await showroom.open(available);
    if(!available.length)throw new Error('No prepared cars are available yet.');
    const id=new URL(location.href).searchParams.get('vehicle'); if(available.some(v=>v.id===id))await chooseVehicle(id);
  } catch(e){error(e.message,true);}
}
start();


