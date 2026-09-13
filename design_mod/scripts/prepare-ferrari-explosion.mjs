// Reproducible visual assembly mapping of the existing Ferrari source.
// Coincident seam grouping preserves every source triangle and material.
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {inspectSource, prepareVehicle, inventory} from './prepare-vehicle.mjs';
const root=new URL('../',import.meta.url), input=fileURLToPath(new URL('public/assets/ferrari.glb',root));
const source=await inspectSource(input,'position'), data=inventory(source);
const body={
  1:['right-front-fender','Right front fender','front_fender','right'],
  2:['windscreen-frame','Windscreen frame'],
  3:['left-front-fender','Left front fender','front_fender','left'],
  4:['right-door','Right door'],6:['left-door','Left door'],
  8:['rear-deck','Rear deck'],9:['right-rear-quarter','Right rear quarter'],10:['left-rear-quarter','Left rear quarter'],
  11:['rear-cabin-cover','Rear cabin cover'],12:['front-bumper','Front bumper cover','front_bumper_cover','center'],
  13:['hood','Hood','hood','center'],14:['right-sill','Right sill'],15:['left-sill','Left sill'],
  17:['right-mirror','Right mirror housing','side_mirror_housing','right'],18:['left-mirror','Left mirror housing','side_mirror_housing','left'],
  21:['rear-bumper','Rear bumper cover'],
};
const nodes=new Map();for(const p of data.pieces){const node=p.id.split('.')[0];if(!nodes.has(node))nodes.set(node,[]);nodes.get(node).push(p);}
const center=p=>p.min.map((v,i)=>(v+p.max[i])/2);
const parts=[];
for(const [node,pieces] of nodes){
  let anchors=pieces.filter(p=>p.triangles>=500 || (node==='n18' && body[Number(p.id.split('.c')[1])]));
  if(!anchors.length)anchors=[pieces.reduce((a,b)=>a.triangles>b.triangles?a:b)];
  const buckets=new Map(anchors.map(p=>[p.id,[p]]));
  for(const p of pieces.filter(p=>!buckets.has(p.id))){const c=center(p);const nearest=anchors.reduce((best,a)=>{const distance=center(a).reduce((sum,v,i)=>sum+(v-c[i])**2,0);return distance<best.distance?{id:a.id,distance}:best;},{distance:Infinity});buckets.get(nearest.id).push(p);}
  for(const [id,group] of buckets){
    const anchor=group[0], c=center(anchor), component=Number(id.split('.c')[1]);
    const named=node==='n18'?body[component]:null;
    const safe=id.replaceAll('.','-');
    const label=named?.[1] || `${anchor.name.replaceAll('_',' ')} ${component+1}`;
    // Push every assembly away from the vehicle's center, including vertically.
    // Parts keep their assembled orientation, matching the homepage's separation spectrum.
    let offset=[Math.abs(c[0])>.12?Math.sign(c[0])*(.65+Math.abs(c[0])*.7):0,(c[1]-.52)*2.1,Math.abs(c[2])>.18?Math.sign(c[2])*(.45+Math.abs(c[2])*.55):0];
    if(Math.abs(c[0])<.35)offset[1]+=.65;
    if(named?.[0]==='hood')offset=[0,1.5,-.65];
    if(Math.hypot(...offset)<.45)offset[1]=.65;
    parts.push({id:named?.[0]||`surface-${safe}`,label,family:named?.[2]||null,side:named?.[3]||null,pieces:group.map(p=>p.id),offsetMeters:offset.map(v=>Number(v.toFixed(3)))});
  }
}
const mapping={vehicleId:'ferrari-458-demo',localDemo:true,sourceHash:source.sourceHash,separateComponents:'position',sourceCredit:'Ferrari 458 Italia by vicent091036, via existing Three.js asset.',lengthMeters:4.527,scaleNote:'Existing registry display length; visual reference only.',frontAxis:'-Z',parts};
await writeFile(new URL('asset-mappings/ferrari-mapping.json',root),JSON.stringify(mapping,null,2)+'\n');
const result=await prepareVehicle(input,mapping,fileURLToPath(new URL('public/repair-assets/ferrari-458-demo/',root)));
console.log(`Prepared ${result.parts.length} moving assemblies, ${result.triangles} original triangles.`);
