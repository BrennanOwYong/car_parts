// CAD files identify modifications; geometry remains independently addressable
// Three.js assemblies. File attachment alone does not reconstruct a new surface.
const storageKey = 'forma-cad-evidence-v1';
const normalize = value => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function evidenceFor(vehicleId) {
  try { return JSON.parse(localStorage.getItem(storageKey) || '{}')[vehicleId] || {}; }
  catch { return {}; }
}
export function matchCadPart(filename, parts) {
  const name = ` ${normalize(filename.replace(/\.[^.]+$/, ''))} `;
  const matches = parts.filter(part => [part.id, part.label].some(value => name.includes(` ${normalize(value)} `)));
  // Prefer the most specific name, e.g. rear windshield over windshield.
  matches.sort((a,b) => normalize(b.label).length - normalize(a.label).length);
  if (!matches.length) return null;
  const best = matches[0];
  if (matches.slice(1).some(part => !normalize(best.label).includes(normalize(part.label)))) return null;
  return best;
}
export function saveEvidence(vehicleId, part, file) {
  let all;
  try { all = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { all = {}; }
  const evidence = {...file, partId: part.id, partName: part.label, savedAt: new Date().toISOString()};
  all[vehicleId] = {...all[vehicleId], [part.id]: evidence};
  // Report quota failures rather than claiming that the file was saved.
  localStorage.setItem(storageKey, JSON.stringify(all));
  return evidence;
}
export function applyCadEvidence(model, vehicleId) {
  const entries = evidenceFor(vehicleId);
  model.traverse(group => {
    const evidence = entries[group.userData.repairPartId];
    if (evidence) {
      group.userData.cadEvidence = evidence; group.userData.edited = true;
      // Showroom materials are shared by default; clone only this assembly's
      // materials so a modification never tints unrelated body panels.
      if (!group.userData.highlightMaterials && !group.userData.cadTinted) {
        group.traverse(mesh => {
          if (!mesh.material) return;
          const tint = material => {const copy=material.clone();if(copy.emissive){copy.emissive.setHex(0x328dc7);copy.emissiveIntensity=.35;}return copy;};
          mesh.material=Array.isArray(mesh.material)?mesh.material.map(tint):tint(mesh.material);
        });
        group.userData.cadTinted=true;
      }
    }
  });
}
export function downloadEvidence(evidence) {
  const anchor = document.createElement('a');
  anchor.href = evidence.dataUrl; anchor.download = evidence.name; anchor.click();
}
