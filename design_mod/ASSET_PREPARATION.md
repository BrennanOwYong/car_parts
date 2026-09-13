# Preparing vehicle reference assemblies

Use the exact catalog source; preserve downloaded archives separately from generated assets. The four requested cars are cataloged in `../vehicle_model_catalog.json`. Being listed there does not mean their geometry is installed.

## Download and inspect

Download the free glTF archive or GLB through the source page while signed in to Sketchfab. Extract a glTF archive with all buffers and textures intact. Record the creator credit, license and actual download date. No credentials or temporary signed download URLs belong in the repository.

From `design_mod`:

```powershell
npm ci
node scripts/prepare-vehicle.mjs inspect "C:/path/to/download/scene.gltf" inventory.json
```

The inventory contains a checksum covering the scene and its dependent resources, source piece identifiers, object/material names, triangle counts and world-space bounds. If a source object contains multiple disconnected surfaces, add `--components`. This separates connected sets of original vertex indices; it never cuts triangles or welds coincident pieces together. It does not infer part identity. Fully joined body panels require a separate geometry-editing step before being mapped.

Create a mapping file using the exact inventory identifiers. Every mapped piece must appear once. Unassigned source pieces are retained in a stationary `Remaining vehicle` assembly. Example shape (identifiers and checksum must come from the actual source):

```json
{
  "vehicleId": "tesla-model-y-2021-sketchfab",
  "sourceHash": "checksum from inventory",
  "licenseReviewed": true,
  "downloadedAt": "YYYY-MM-DD",
  "sourceCredit": "Exact source credit from the download page",
  "lengthMeters": 4.75,
  "scaleNote": "Explain the display scale and cite a dimension source if used; otherwise label it an estimate.",
  "rotationDegrees": [0, 0, 0],
  "frontAxis": "+Z",
  "separateComponents": false,
  "parts": [
    {"id":"hood","label":"Hood","family":"hood","side":"center","pieces":["n0.p0.c0"],"offsetMeters":[0,1.1,0.6]},
    {"id":"front-bumper","label":"Front bumper cover","family":"front_bumper_cover","side":"center","pieces":["n1.p0.c0"],"offsetMeters":[0,0,1.5]}
  ]
}
```

Orient source geometry with its length along Z and up along Y. Positive/negative forward direction is recorded in `frontAxis`. `lengthMeters` normalizes display size only; it never establishes fitting accuracy. Offsets are in the normalized scene's metres. Source world transforms and materials are retained in the regrouped surfaces.

```powershell
node scripts/prepare-vehicle.mjs prepare "C:/path/to/download/scene.gltf" vehicle-mapping.json
```

Default output is `public/repair-assets/<vehicleId>/vehicle.glb` plus `manifest.json`. The running server discovers prepared files without changing application code. Keep actual production mappings in `asset-mappings/`. Inspect the assembled silhouette and each mapped surface before publishing an entry. This command prepares visual assemblies; it does not fabricate missing parts or generate installation geometry.

## Five families

| Family | Side | Behavior |
| --- | --- | --- |
| `hood` | center | One central repair candidate |
| `front_bumper_cover` | center | One central repair candidate |
| `front_fender` | left / right | Independent side-specific candidates |
| `wheel_arch_trim` | left / right | Only map physically present trim; do not substitute tires or an entire fender |
| `side_mirror_housing` | left / right | Independent side-specific candidates |

Other assemblies have a null family and remain inspectable. A family missing from the source is reported unavailable rather than fabricated. Left/right is the vehicle occupant's perspective. Unknown laterality never highlights both sides and prevents generation until clarified.

## Existing Corolla demonstration

The bundled Corolla's source is described only as user-supplied in `COROLLA.md`. Its original author and reuse rights are unverified. The preparation fixture records `localDemo: true`, uses no invented download date, and assigns no third-party license. This exception only applies to `corolla-prepared-demo`; it cannot activate the four requested external vehicles. The local demo contains 43 visual assemblies. It is not redistributed as a newly licensed source or used as any of the requested car models.

## Limitations

- Static triangle geometry is supported. Skinning, morph targets and instancing must first be converted to static surfaces.
- Draco-compressed inputs are decoded. Unsupported input extensions fail explicitly. Original animation tracks are omitted; runtime explosion uses the explicit manifest offsets.
- Connected components preserve source index connectivity. Seams with duplicated indices may form small separate pieces; a mapping can group them together.
- Original textures, including single-color textures, and vertex attributes are retained. The default library pruning options would otherwise remove some of these.

## References

Official documentation consulted 2026-09-13. Installed versions are recorded in `package-lock.json` (Three.js 0.180 and glTF Transform 4):

- https://sketchfab.com/developers/download-api/downloading-models
- https://gltf-transform.dev/modules/core/classes/NodeIO
- https://gltf-transform.dev/modules/core/classes/Node
- https://gltf-transform.dev/modules/core/classes/Primitive
- https://gltf-transform.dev/modules/core/classes/Accessor
- https://gltf-transform.dev/modules/functions/functions/compactPrimitive
- https://gltf-transform.dev/modules/functions/interfaces/PruneOptions
- https://threejs.org/docs/pages/GLTFLoader.html

## Existing Ferrari showroom preview
The bundled Ferrari is now prepared as four original wheel assemblies plus the remaining vehicle. It is a local visualization with unverified source terms, not a newly downloaded asset. Its body remains combined and no repair family is assigned. The registry repairNotice explains this when selected and disables sending a repair request. The localDemo exception now explicitly includes ferrari-458-demo as well as Corolla; external downloads still require review and a download date. The reproducible mapping is asset-mappings/ferrari-mapping.json.


## Ferrari full explosion (supersedes wheel-only preparation)
Run node scripts/prepare-ferrari-explosion.mjs to rebuild 131 independently moving assemblies. The --position-components inspection groups coincident vertex positions at source-space precision 0.00001 solely to infer connectivity; exported vertices, normals, textures and triangles are not welded or cut. The original body yields distinct hood, bumper, fenders, mirrors, doors and rear panels. Small pieces are attached to the nearest substantial component within the same original material node. Every assembly has an outward offset including vertical separation. All 358,788 source triangles are retained. Wheel-arch trim is not invented when absent. The mapping supersedes the earlier four-wheel-plus-context demo.

