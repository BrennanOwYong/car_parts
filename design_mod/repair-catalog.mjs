import {readFile, access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {corollaVehicle, repairVehicles, preparedAsset} from './asset-library.mjs';

export const repairRoot = path.dirname(fileURLToPath(import.meta.url));
export const repairFamilies = {
  hood: 'Hood', front_bumper_cover: 'Front bumper cover', front_fender: 'Front fender',
  wheel_arch_trim: 'Wheel-arch trim', side_mirror_housing: 'Mirror housing',
};
export const demoVehicle = corollaVehicle;

export async function repairCatalog() {
  return {families: repairFamilies, vehicles: await Promise.all(repairVehicles.map(async vehicle => {
    let prepared = null, status = 'awaiting_download';
    try {
      const file = path.join(repairRoot, 'public/repair-assets', vehicle.id, 'manifest.json');
      const manifest = JSON.parse(await readFile(file, 'utf8'));
      if (manifest.vehicleId !== vehicle.id || manifest.version !== 1 || !Array.isArray(manifest.parts) || manifest.parts.length < 2) throw new Error('Invalid manifest');
      await access(path.join(repairRoot, 'public/repair-assets', vehicle.id, 'vehicle.glb'));
      prepared = {...manifest, asset: preparedAsset(vehicle.id)};
      status = 'prepared';
    } catch (error) {
      if (error.code !== 'ENOENT') status = 'needs_preparation';
    }
    return {...vehicle, status, prepared};
  }))};
}
