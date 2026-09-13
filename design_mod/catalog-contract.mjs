// The browser and Node API must agree before any car controls are rendered.
export const CATALOG_SCHEMA_VERSION=1;
const restart='The studio and car-data server are out of sync. Stop the old server, run npm run dev from car_parts/design_mod, then reload this page.';
const label=value=>typeof value==='string'&&value.trim().length>0;
const vector=value=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite);
export function assertCatalog(catalog){
  const fail=()=>{throw new Error(restart);};
  if(catalog?.schemaVersion!==CATALOG_SCHEMA_VERSION||!Array.isArray(catalog.vehicles)||!catalog.vehicles.length)fail();
  const ids=new Set();
  for(const vehicle of catalog.vehicles){
    if(!vehicle||!['id','make','model','shortName','year','bodyStyle','asset','adapter','attribution','assetSource','license'].every(key=>label(vehicle[key])))fail();
    if(ids.has(vehicle.id)||!vehicle.asset.startsWith('/assets/')||!Number.isFinite(vehicle.rotationY)||!Number.isFinite(vehicle.dimensions?.length)||vehicle.dimensions.length<=0)fail();
    ids.add(vehicle.id);
    for(const region of ['front','sides','rear']){
      const transform=vehicle.kit?.[region];
      if(!vector(transform?.scale)||!vector(transform?.offset)||!transform.scale.every(n=>n>0))fail();
    }
  }
  for(const [key,expected] of [['regions',['front','sides','rear']],['styles',['subtle','sport','aggressive']]]){
    if(!Array.isArray(catalog[key])||catalog[key].length!==expected.length)fail();
    const records=catalog[key];
    for(const id of expected){
      const item=records.find(record=>record?.id===id);
      if(!item||!label(item.name)||(key==='regions'?!vector(item.anchor):!label(item.tag)))fail();
    }
  }
  return catalog;
}
