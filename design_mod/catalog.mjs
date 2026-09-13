export {ferrariVehicle as vehicle} from './asset-library.mjs';
import {ferrariVehicle as vehicle} from './asset-library.mjs';
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
  if (!input || input.vehicleId !== vehicle.id) throw new Error('Choose a supported vehicle.');
  if (!input.selections || typeof input.selections !== 'object' || Array.isArray(input.selections)) throw new Error('A parts selection is required.');
  const selected = {};
  for (const [region,style] of Object.entries(input.selections)) {
    if (!regions.some(r=>r.id===region) || !['stock',...styles.map(s=>s.id)].includes(style)) throw new Error('Unknown part or design.');
    if (style !== 'stock') selected[region] = style;
  }
  if (!Object.keys(selected).length) throw new Error('Select at least one modification.');
  return selected;
}
