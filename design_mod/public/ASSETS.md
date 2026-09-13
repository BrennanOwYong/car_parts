# Asset credits

## Car visualization

Ferrari 458 model by **vicent091036**, distributed as `ferrari.glb` in the Three.js examples.

- Creator link credited by Three.js: https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6
- Example: https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_car.html
- Download source: https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari.glb
- Matching contact-shadow texture: https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari_ao.png
- Retrieved: 2026-09-13.
- Changes: display materials replaced; scale normalized to nominal 458 overall length; hover regions extracted for display.

The source example labels the asset “Ferrari 458 Italia.” The file depicts an open-top vehicle, so this demo identifies it as the Ferrari 458 series without claiming exact trim or model year. It is a visualization mesh, not OEM engineering CAD.

The original creator page/API was unavailable during verification (API returned 404). The model file has no embedded copyright statement. Its separate asset license has **not been verified**; Three.js code's MIT license does not by itself establish rights to the car model. This checkout is a local hackathon prototype. Obtain the creator's applicable reuse terms or replace the asset with a verified licensed model before publishing or commercial distribution. See ../CAR_LIBRARY.md for researched alternatives.

## Toyota Corolla 2020

**Toyota Corolla 2020 by ItsDiyor**, [creator model](https://sketchfab.com/3d-models/toyota-corolla-2020-6d7d34ee42734d1ab28a6b1f1c5fc4fc), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Source GLB supplied by the user. Publisher attribution/license rechecked through the public Sketchfab model API on 2026-09-13.

Local file: `assets/corolla-exploded.glb`. Changes: existing mesh islands grouped into 43 named visual assemblies; embedded explosion animation; studio presentation rotates and normalizes the car and adjusts paint materials. Original texture detail and triangle boundaries are preserved. Exact market/trim and engineering fit remain unverified.

SHA-256: `22cbfe2df8b1f6fe613e1c3a7b462885dc071d28890609b1843805610b8044ba`.

## Porsche 911 Carrera 4S

**(FREE) Porsche 911 Carrera 4S by Karol Miklas / Lionsharp Studios**, [creator model](https://sketchfab.com/3d-models/free-porsche-911-carrera-4s-d01b254483794de3819786d93e0e1ebf), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The GLB metadata credits Karol Miklas; the current creator profile is Lionsharp Studios.

- Authorized public distribution: [PlayCanvas Web Components example asset](https://github.com/playcanvas/web-components/blob/main/examples/assets/models/porsche-911-carrera-4s.glb).
- Download: `https://raw.githubusercontent.com/playcanvas/web-components/main/examples/assets/models/porsche-911-carrera-4s.glb`, retrieved 2026-09-13.
- Local file: `assets/porsche-911-carrera-4s.glb`, SHA-256 `421fdabf0da312edb3c22dc0fc915bcc75551ff0db7374a7ebac8af80efc5ea2`.
- Both embedded metadata and the current Sketchfab API specify **CC BY-SA 4.0**, which takes precedence over the abbreviated CC BY label on the PlayCanvas tutorial.
- Changes in presentation: source ground/shadow plane omitted from display; physically based paint replaces the legacy separate coat layer; orientation and approximate overall length normalized; connected source islands grouped into 36 visual assemblies for reversible explosion. The downloaded GLB is unchanged.
- The asset and adapted model presentation retain CC BY-SA 4.0. Preserve attribution, license links and this change notice when distributing adapted model content. This notice does not relicense unrelated application code.
- Exact year and engineering dimensions are unverified. It is a visualization mesh, not Porsche CAD or a verified mounting reference.

## Original modification geometry and illustrations

The three design families, concept clearance holes, illustrative metal fastener meshes and assembly-guide line drawings are original prototype work in this project. Manufacturer references in the guide informed the distinction between attachment methods; no branded body-kit CAD was imported. Metal hardware is not included in printable part STL exports. The 6.6 mm holes and hardware pattern are illustrative and are not approved vehicle attachment points.

## Libraries

- Three.js 0.180.0: MIT, https://github.com/mrdoob/three.js/blob/r180/LICENSE
- Bundled Draco decoder: Google Draco, Apache-2.0; notice in DRACO-LICENSE.txt.
- fflate: MIT, https://github.com/101arrowz/fflate
- Vite: MIT, https://github.com/vitejs/vite
- DM Sans: Google Fonts / SIL Open Font License; optional remote stylesheet, https://fonts.google.com/specimen/DM+Sans/license

The modification profiles are original procedural demo geometry authored in this project. The exported kits contain those profiles only; they do not include the third-party car model.
