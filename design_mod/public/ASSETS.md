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

## Libraries

- Three.js 0.180.0: MIT, https://github.com/mrdoob/three.js/blob/r180/LICENSE
- Bundled Draco decoder: Google Draco, Apache-2.0; notice in DRACO-LICENSE.txt.
- fflate: MIT, https://github.com/101arrowz/fflate
- Vite: MIT, https://github.com/vitejs/vite
- DM Sans: Google Fonts / SIL Open Font License; optional remote stylesheet, https://fonts.google.com/specimen/DM+Sans/license

The modification profiles are original procedural demo geometry authored in this project. The exported kits contain those profiles only; they do not include the third-party car model.
