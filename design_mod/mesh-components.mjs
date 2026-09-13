// Preserve source triangles and UV seams when making visual assemblies.
// No new engineering surfaces or hidden mechanical parts are generated here.
export function connectedComponents(positions, indices, weld = false) {
  const count = positions.length / 3;
  const parent = new Int32Array(count);
  for (let i = 0; i < count; i++) parent[i] = i;
  function root(i) {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  }
  if (weld) {
    const points = new Map();
    for (const i of indices) {
      const key = `${Math.round(positions[i * 3] * 10000)},${Math.round(positions[i * 3 + 1] * 10000)},${Math.round(positions[i * 3 + 2] * 10000)}`;
      if (points.has(key)) parent[root(i)] = root(points.get(key));
      else points.set(key, i);
    }
  }
  for (let i = 0; i < indices.length; i += 3) {
    const a = root(indices[i]);
    parent[root(indices[i + 1])] = a;
    parent[root(indices[i + 2])] = a;
  }
  const components = new Map();
  for (let i = 0; i < indices.length; i += 3) {
    const key = root(indices[i]);
    if (!components.has(key)) components.set(key, []);
    components.get(key).push(indices[i], indices[i + 1], indices[i + 2]);
  }
  return [...components.values()];
}
