export const vehicle = {
  id: 'ferrari-458-demo', make: 'Ferrari', model: '458', year: '2009–2015',
  generation: '458 series · Open-top visualization', bodyStyle: 'Open-top demo asset', asset: '/assets/ferrari.glb',
  dimensions: {length:4527, width:1937, height:1213, wheelbase:2650},
  source: 'https://www.ferrari.com/en-EN/auto/458-italia',
  attribution: 'Ferrari 458 Italia by vicent091036, via Three.js',
  assetSource: 'https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6',
  fitStatus: 'visual-prototype',
  identityNote: 'The Three.js example calls this asset 458 Italia; the mesh depicts an open-top car. Exact year and trim are not verified.',
  adapter: 'ferrari', rotationY: 0, shortName: '458', category: 'OPEN-TOP SPORTS CAR',
  description: 'Sculpted in Maranello. Reimagined by you.',
  license: 'Asset license unverified',
  kit: {
    front: {scale:[1,1,1],offset:[0,0,0]},
    sides: {scale:[1,1,1],offset:[0,0,0]},
    rear: {scale:[1,1,1],offset:[0,0,0]},
  },
};
export const vehicles = [vehicle, {
  id:'toyota-corolla-2020', make:'Toyota', model:'Corolla', shortName:'Corolla', year:'2020',
  generation:'E210 · Sedan visualization', bodyStyle:'Sedan', category:'EVERYDAY, REIMAGINED',
  description:'A familiar silhouette. An entirely new expression.',
  asset:'/assets/corolla-exploded.glb', adapter:'corolla', rotationY:Math.PI,
  dimensions:{length:4630,width:1780,height:1435,wheelbase:2700},
  source:'https://www.toyota.com/owners/warranty-owners-manuals/digital/article/corolla/2020/om12k77u/ch09se010401/',
  attribution:'Toyota Corolla 2020 by ItsDiyor',
  assetSource:'https://sketchfab.com/3d-models/toyota-corolla-2020-6d7d34ee42734d1ab28a6b1f1c5fc4fc',
  license:'CC BY 4.0', licenseUrl:'https://creativecommons.org/licenses/by/4.0/', fitStatus:'visual-prototype',
  identityNote:'Creator identifies this as a 2020 Corolla. Exact market and trim are unverified. The 43 source-derived assemblies are visual groupings, not OEM part definitions.',
  kit:{
    front:{scale:[.96,1,1.025],offset:[0,.055,-.015]},
    sides:{scale:[.98,1,1.13],offset:[0,.04,.025]},
    rear:{scale:[.97,1,.8],offset:[0,.285,.49]},
  },
}, {
  id:'porsche-911-carrera-4s', make:'Porsche', model:'911 Carrera 4S', shortName:'911',
  year:'Creator model · year unverified', generation:'911 Carrera 4S · Coupé visualization', bodyStyle:'Coupé', category:'AN ICON, REINTERPRETED',
  description:'An unmistakable shape. Your own finishing touch.',
  asset:'/assets/porsche-911-carrera-4s.glb', adapter:'porsche', rotationY:Math.PI,
  dimensions:{length:4470}, scaleNote:'Approximate 4.47 m visualization reference; exact model year and dimensions are unverified.',
  attribution:'Porsche 911 Carrera 4S by Karol Miklas / Lionsharp Studios, via PlayCanvas',
  assetSource:'https://sketchfab.com/3d-models/free-porsche-911-carrera-4s-d01b254483794de3819786d93e0e1ebf',
  source:'https://developer.playcanvas.com/user-manual/web-components/loading-models/',
  license:'CC BY-SA 4.0', licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/', fitStatus:'visual-prototype',
  identityNote:'The creator identifies a 911 Carrera 4S without a model year. Visual assemblies are grouped from existing mesh islands. No unmodeled mechanical internals are added.',
  kit:{
    front:{scale:[1,1,.97],offset:[0,.035,-.065]},
    sides:{scale:[1.015,1,1.15],offset:[0,.005,-.015]},
    rear:{scale:[.94,1,.65],offset:[0,.155,.71]},
  },
}];
export function getVehicle(id) {return vehicles.find(v=>v.id===id);}
export const regions = [
  {id:'front',name:'Front lip',subtitle:'A sharper first impression.',label:'01', anchor:[0,.35,-2.1]},
  {id:'sides',name:'Side skirts',subtitle:'A new line from front to rear.',label:'02',anchor:[.99,.26,0]},
  {id:'rear',name:'Rear spoiler',subtitle:'Finish with a little attitude.',label:'03',anchor:[0,.98,1.9]},
];
export const styles = [
  {id:'subtle',name:'Pure',tag:'SUBTLE',description:'Clean contours. An understated extension of the original.'},
  {id:'sport',name:'Sport',tag:'BALANCED',description:'A wider stance and a more defined silhouette.'},
  {id:'aggressive',name:'Aero',tag:'EXPRESSIVE',description:'Deeper profiles. A distinctly track-inspired presence.'},
];
export function validateConfiguration(input) {
  if (!input || !getVehicle(input.vehicleId)) throw new Error('Choose a supported vehicle.');
  if (!input.selections || typeof input.selections !== 'object' || Array.isArray(input.selections)) throw new Error('A parts selection is required.');
  const selected = {};
  for (const [region,style] of Object.entries(input.selections)) {
    if (!regions.some(r=>r.id===region) || !['stock',...styles.map(s=>s.id)].includes(style)) throw new Error('Unknown part or design.');
    if (style !== 'stock') selected[region] = style;
  }
  if (!Object.keys(selected).length) throw new Error('Select at least one modification.');
  return selected;
}
