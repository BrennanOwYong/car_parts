import './library.css';

export function createCarLibrary(vehicles,initialId){
  const $=id=>document.getElementById(id);
  let selected=vehicles.find(v=>v.id===initialId)||vehicles[0];
  const library=document.createElement('div');library.className='car-library';library.setAttribute('aria-label','Ready vehicle library');
  const heading=document.createElement('div');heading.className='library-heading';
  heading.innerHTML=`<span>THE COLLECTION</span><span>${String(vehicles.length).padStart(2,'0')} CARS / READY TO EXPLORE</span>`;
  library.append(heading);
  const cards=document.createElement('div');cards.className='vehicle-cards';library.append(cards);
  for(const [i,v] of vehicles.entries()){
    const b=document.createElement('button');b.type='button';b.className='vehicle-card';b.dataset.vehicle=v.id;b.setAttribute('aria-label',`Choose ${v.make} ${v.model}`);
    b.innerHTML=`<span class="vehicle-card-top"><span>${String(i+1).padStart(2,'0')}</span><span class="vehicle-ready-dot"></span></span><small>${v.make.toUpperCase()}</small><strong>${v.shortName}</strong><span class="vehicle-card-bottom">${v.bodyStyle}<span>↗</span></span>`;
    b.onclick=()=>select(v.id);cards.append(b);
  }
  $('vehicle-form').before(library);
  $('make').replaceChildren(...[...new Set(vehicles.map(v=>v.make))].map(make=>new Option(make,make)));
  function select(id){
    selected=vehicles.find(v=>v.id===id)||vehicles[0];
    $('make').value=selected.make;
    $('model').replaceChildren(...vehicles.filter(v=>v.make===selected.make).map(v=>new Option(v.model,v.id)));
    $('model').value=selected.id;
    $('year').replaceChildren(new Option(selected.year,selected.year));
    $('body-style').replaceChildren(new Option(selected.bodyStyle,selected.bodyStyle));
    for(const b of cards.children){const active=b.dataset.vehicle===id;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));}
    const note=document.querySelector('.available-note>span:nth-child(2)');
    note.replaceChildren(document.createTextNode(`${selected.make} ${selected.model} is ready to explore.`),document.createElement('br'));
    const small=document.createElement('small');small.textContent='Exploded view · 3 mod regions · 9 concept designs';note.append(small);
    document.querySelector('.available-note .badge').textContent='3D READY';
    document.querySelector('.setup-watermark').textContent=selected.shortName;
  }
  $('make').onchange=()=>select(vehicles.find(v=>v.make===$('make').value).id);
  $('model').onchange=()=>select($('model').value);
  $('year').parentElement.firstChild.textContent='Model year / edition';
  select(selected.id);
  return {get selected(){return selected;},select};
}

export function createExplodeControls(onChange){
  const root=document.createElement('div');root.className='explode-controls';root.id='explode-controls';
  root.innerHTML='<div class="explode-heading"><span>EXPLORE THE ANATOMY</span><span id="assembly-count">Preparing assemblies</span></div><div class="explode-row"><button id="explode-toggle" aria-pressed="false" disabled><span aria-hidden="true">⊞</span> Explode view</button><label class="explode-range"><span class="sr-only">Exploded view amount</span><input id="studio-explode" type="range" min="0" max="100" value="0" disabled aria-label="Exploded view amount"></label><output id="explode-value" for="studio-explode">0%</output></div>';
  document.querySelector('.viewport-wrap').append(root);
  const range=root.querySelector('input'),toggle=root.querySelector('button');let target=0;
  function set(value){
    target=Math.max(0,Math.min(1,value));range.value=Math.round(target*100);
    range.style.setProperty('--fill',`${target*100}%`);root.querySelector('output').value=`${Math.round(target*100)}%`;
    toggle.innerHTML=target>.01?'<span aria-hidden="true">⊟</span> Reassemble':'<span aria-hidden="true">⊞</span> Explode view';
    toggle.setAttribute('aria-pressed',String(target>.01));onChange(target);
  }
  range.oninput=()=>set(Number(range.value)/100);toggle.onclick=()=>set(target>.01?0:1);
  return {set,ready(count){range.disabled=toggle.disabled=!count;root.querySelector('#assembly-count').textContent=count?`${count} visual assemblies`:'Preparing assemblies';}};
}
