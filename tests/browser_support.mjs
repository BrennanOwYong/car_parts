// Focus a real prepared record through the live showroom's arrow controls.
export async function focusPreparedVehicle(page,id) {
  const {vehicles}=await(await page.request.get(new URL('/api/repair/catalog',page.url()).href)).json();
  const ready=vehicles.filter(vehicle=>vehicle.prepared),target=ready.findIndex(vehicle=>vehicle.id===id);
  if(target<0)throw new Error(`Prepared vehicle ${id} is unavailable`);
  await page.waitForFunction(()=>document.getElementById('showroom-name')?.textContent.length>0,null,{timeout:45000});
  const label=await page.locator('#vehicle-list').getAttribute('aria-label');
  const current=ready.findIndex(vehicle=>label===`Select ${vehicle.make} ${vehicle.model}`);
  if(current<0)throw new Error('The showroom focus does not match the live catalog');
  for(let index=current;index!==target;index+=Math.sign(target-current))await page.locator(target>current?'#showroom-next':'#showroom-previous').click();
  await page.waitForFunction(expected=>document.getElementById('vehicle-list').getAttribute('aria-label')===expected,`Select ${ready[target].make} ${ready[target].model}`);
}
