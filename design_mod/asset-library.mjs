// All pages and the repair service resolve vehicle identities from this registry.
import registry from '../vehicle_model_catalog.json' with {type: 'json'};
export const ferrariVehicle = registry.local_models.find(v => v.id === 'ferrari-458-demo');
export const corollaVehicle = registry.local_models.find(v => v.id === 'corolla-prepared-demo');
export const repairVehicles = [...registry.models, ...registry.local_models.filter(v => v.demo || v.id === 'ferrari-458-demo')];
export const preparedAsset = id => `/repair-assets/${encodeURIComponent(id)}/vehicle.glb`;
