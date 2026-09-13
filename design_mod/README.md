# FORMA — body kit design studio

A local hackathon demo: choose Ferrari 458, Toyota Corolla 2020, or Porsche 911 Carrera 4S; orbit and explode the actual car meshes; select editable painted assemblies; configure front lips, side skirts and rear spoilers; inspect an exploded metal-fastener concept; and export individual STL parts, an illustrated assembly field guide, hardware BOM and manifest. Exact year/trim is unverified where stated in the catalog. Ferrari is the user's selected visualization-only attachment study.

## Run

Requires Node.js 20.19+ (tested with the installed Node runtime).

```sh
cd design_mod
npm ci
npm run dev
```

Open http://localhost:8788. The server binds to loopback. No API key is needed. Assets and Draco decoding are local; the optional Google Fonts stylesheet can fall back to Arial offline.

```sh
npm test
npm run build
npm start
```

The same commands work on macOS, Linux, and Windows.

### After pulling changes

Run from `car_parts/design_mod`. Stop any older server already using the port, then run `npm ci` and `npm run dev`. Development mode now restarts the Node backend when its imported catalog, geometry or guide modules change; Vite continues to update the frontend. `npm start` rebuilds the frontend before serving production files.

If car labels show `undefined`, check that the backend was restarted too: updating browser files alone can leave an old in-memory catalog running. The current `/api/catalog` has `schemaVersion: 1` and Ferrari, Toyota and Porsche records. The frontend now rejects an incompatible catalog with explicit restart instructions instead of rendering missing fields. Restarting clears temporary export downloads; re-export any kit whose link has expired.

## Implemented boundary

- Fix Part uses the Python repair relay and includes a native iOS scan bridge; the design studio and learning pages work without an analysis service key.
- The landing experience is separate from the studio. Fix Part is enabled at `/fix.html`; the separate learning flow is documented below.
- Vehicle selection loads three prepared, locally stored assets, not live web-scraped engineering models. Make/model fields and collection cards stay synchronized. In-memory build selections and paint are preserved separately per car.
- Ferrari, Corolla and Porsche expose 34, 43 and 36 visual assembly groups. Connected source islands move intact; unmapped windows and other non-mod surfaces do not select modifications. Explosion is reversible, and selected mod parts follow their corresponding assembly offsets.
- The car assets are visualization meshes, not OEM CAD. Scaling to an overall-length reference does not establish attachment accuracy. See each catalog record for identity and scale caveats.
- Three original styles per region per car (27 combinations) have thinner solid profiles and actual Ø6.6 mm concept through-holes. Hole positions are not measured OEM patterns. Do not describe these as fitted or plug-and-play vehicle parts.
- The hardware close-up illustrates purchased metal bolts, washers, backing plates, locking nuts and pads. These are not printable structural fasteners. The seven-section guide covers the bench demonstration and lists missing engineering-release checks, not an on-car installation procedure. See `MOUNTING_RESEARCH.md`.
- “Print” creates prototype STL files; it does not submit a print order. Skirts export separately for left and right. The manifest includes dimensions, mm units, Z-up orientation, and fit status.
- Pure, Sport, and Aero are original demo styles, not verified popularity rankings or replicas of branded aftermarket kits.
- Configurations live in browser memory. Export links encode the selected vehicle and styles, so the server can recreate the same files after restarting.

## Integration contract

- `GET /api/catalog`: `vehicles`, `regions`, `styles`, `mountingConcept`, `mountingReferences`. Vehicle records carry identity, asset URL, adapter, dimensions, attribution, license, per-region profile transforms and fit status.
- `POST /api/exports`: `{ "vehicleId": "ferrari-458-demo", "selections": { "front": "sport", "sides": "subtle", "rear": "stock" } }`. At least one non-stock choice required. Returns selected vehicle ID/name, geometry revision, parts/STL URLs, part-local hole coordinates, hardware BOM, `guideUrl`, `bomUrl` and ZIP URL. Also accepts `toyota-corolla-2020` and `porsche-911-carrera-4s`.
- `GET /api/exports/:id/:filename`: generated file; unknown or expired export returns 404.
- Invalid input returns 400; requests over 8 KB return 413. Only predefined vehicle, region, and style IDs are accepted.

`geometry.mjs` is shared by preview and server export. Scene geometry is in metres; exports convert to millimetres and Z-up with each part placed on z=0. The geometry tests weld coordinates for edge checks and verify finite vertices, closed edges, positive volume, and binary STL size. These checks establish mesh validity, not fit or manufacturing suitability.

## Adding a vehicle

See `CAR_LIBRARY.md` for researched candidates. Before enabling a car: obtain the authorized GLB, record attribution and reuse terms, inspect variant and geometry, normalize orientation and scale, map editable assemblies, and prepare its concept profile transforms. `vehicle-scene.mjs` handles source-preserving preparation and explosion. `mesh-components.mjs` groups connected islands; tests decode the actual assets using the glTF utilities in dev dependencies. Adding a catalog label alone is insufficient.

Tests cover all 27 vehicle/style combinations, closed STL edges, finite coordinates, positive volume, circular through-hole clearances, export hole coordinate frames, hardware BOM quantities, truthful guide status, source triangle preservation, glass exclusion and reversible assembly offsets. `HMR_PORT` can select an independent Vite websocket port when multiple local preview servers run at once.

For a future measured version, replace concept profiles with part templates built around verified attachment geometry; retain the same preview/export identity. Keep engineering validation separate from visual asset metadata.

## FORMA landing experience

The homepage includes a full-screen Corolla scene tied to native page scrolling. It starts in an assembled side profile, rotates to a raised three-quarter view while the 43 assemblies separate, holds the exploded formation, then blurs behind the original Fix part / Design mod / Car accessory cards. The sequence reverses on upward scroll. Design mod retains the existing setup, configuration, and export flow; Fix Part links to its repair showroom.

The homepage scene is isolated in `src/landing.js`, with its reversible phase timing in `src/landing-motion.mjs` and scoped presentation in `src/landing.css`. It reads the animation embedded in `public/assets/corolla-exploded.glb`. It releases the render loop when leaving the homepage or hiding the tab, and renders only when the scroll pose changes. Reduced-motion settings keep the car assembled and the mode cards accessible.

Start the complete app with `npm run dev` (default port 8788); the plain Vite server does not provide the studio API.


## Immersive learning

Open `/learning.html` or choose **Immersive learning** on the landing page. All three cars are selectable: Porsche 911 Carrera 4S, Ferrari 458, and Toyota Corolla.

- Each car has a live ten-second turn/explode/reassemble introduction, skip/replay controls, orbit/zoom, and hover/click part navigation.
- Wheels, brakes, body, glazing, lighting, and cabin lessons clone the selected car’s original source triangles, normals, UVs, and available materials. No simplified mechanical models remain. One front corner is isolated for wheels and brakes; other systems preserve their actual source assemblies.
- Component buttons are generated from available source groups. A single combined source assembly cannot be falsely split into unmodeled subcomponents. Separation is a visual study, not a workshop removal sequence.
- Four chapters per system cover composition, physics, design, and history. Design uses an optional satin material to inspect unchanged geometry. Historical mechanisms are described in text; fabricated historical 3D replicas are not shown.
- Physics exercises state their illustrative assumptions. The engine event-rate calculation uses six, eight, or four cylinders according to the selected course.
- Course-scoped routes are `#car/porsche`, `#car/ferrari`, `#car/toyota`, and `#lesson/<course>/<system>/<chapter>`. Legacy Porsche deep links still work. Browser progress is isolated by course; existing Porsche progress migrates automatically.
- Course references selected for future exact engine sourcing are the 2010 911 Carrera 4S (997.2), 2012 458 Spider, and 2020 US Corolla LE. Existing exterior meshes are creator visualizations with unverified trim fidelity, not certified OEM CAD.
- **Exact engine 3D remains incomplete.** None of the existing car files includes a complete engine. Generic CAD was researched and excluded after the user required exact engines. The engine page shows a clear pending state and manufacturer-based text/calculations, with no substitute geometry. See `LEARNING_ASSETS.md`.
- Credits and source terms are available at `/learning.html#credits`. Ferrari’s existing asset license remains unverified; Porsche adaptations retain CC BY-SA 4.0 and Corolla attribution retains CC BY 4.0.

The UI keeps the Astra-inspired near-black surfaces, original star field, white editorial typography, pill controls, and soft route transitions. Motion respects reduced-motion preferences. Part rendering is bounded by actual source detail; these are render meshes, not native CAD solids or photoreal engine assets.

Implementation is isolated in `src/learning*.{js,mjs,css}` and `learning.html`, using the shared vehicle preparation module. `npm run build` includes the learning entry. Tests verify route/progress isolation, cylinder-specific calculations, and preservation of actual shipped part geometry across all three courses.


# FORMA showroom and repair demo

This directory contains the active FORMA web demo. It combines the original dark exploded-view landing page, the Design Mod Ferrari body-kit studio, and the Fix Part showroom where vehicle damage photos can be mapped to repair families through the Astra conversation flow.

The local server runs at `http://localhost:8788`.

## Run

Requires Node.js 20.19 or later.

```sh
npm ci
npm run dev
```

Useful routes:

- `/` - FORMA landing page.
- `/fix.html` - horizontal vehicle showroom.
- `/fix.html?vehicle=ferrari-458-demo` - Ferrari repair workspace.
- `/fix.html?vehicle=corolla-prepared-demo` - Corolla repair workspace with saved demo reference parts.
- `/studio.html` or the existing Design Mod entry path - body-kit configuration and export flow when routed from the landing page.

Build and test commands:

```sh
npm run build
npm test
```

The server binds to loopback for local demos. The OpenAI API key belongs in the repository root `.env` file and is used only by the server-side repair relay path.

## What is implemented

- A full-screen charcoal showroom experience driven by Three.js [browser 3D rendering library].
- Shared vehicle metadata from `../vehicle_model_catalog.json` through `asset-library.mjs`.
- Prepared Toyota Corolla and Ferrari 458 repair assets.
- Partial exploded-view repair mode with clickable assemblies.
- Astra chat support for pasted or uploaded damage images.
- Five repair families for the damage workflow: hood, front bumper cover, front fender, wheel arch trim or fender flare, and side mirror housing.
- Red pulsing highlights for damaged or selected repair assemblies.
- A saved Corolla reference-part library with downloadable fitted and exploded OpenSCAD files.
- A simulated scan-to-custom-part flow that creates a lightweight web preview and matching demo CAD output for an edited assembly.
- iPhone/iPad detection, camera fallback, and an optional native LiDAR handoff. Native host source and setup are in [native/ios](native/ios/README.md); the app itself is not packaged yet.
- A 43-part Corolla collection with CAD attachments mapped by filename, persistent modification records, blue pulsing part highlights, and a downloadable CAD annotation.

## CAD attachment demo

Open the Corolla repair workspace, expand **43 individual parts**, and select **Front bumper**. Choose **Create demo CAD** to save a named placeholder file, or **Attach CAD** to upload a file such as `front-bumper-custom.step`. The filename must contain one assembly's name or identifier; ambiguous names are rejected. The mapped assembly gets a **Modified** record below the view and a **View CAD** annotation. Damage still pulses red, taking precedence over the blue modification highlight.

`src/cad-evidence.js` saves the actual attachment and mapping in browser local storage, scoped by vehicle and stable part identifier. Attachments are limited to 2 MB for this demo. Reloading restores the records; clearing browser storage removes them. This is local persistence, not an account-backed document store.

The vehicle download is a container of independently selectable Three.js assemblies, not a fused surface. Each assembly is registered in `RepairViewer.groups` by `repairPartId`, so it can move, highlight, or be replaced independently. CAD attachment records mark a modification without parsing or changing its geometry. The existing scan replacement path swaps the selected assembly's preview meshes; a production CAD conversion worker will provide those meshes from the uploaded file.

## Projected buildout

The current demo is a visual and interaction prototype for two larger product flows.

Damage-to-repair should become a document-grounded system where Astra reads damage photos, identifies the likely exterior assembly, checks mechanic or original equipment manufacturer (OEM) documents, and retrieves the correct replacement reference.

Scan-to-custom-part should let a user select an assembly, scan a physical part with a phone, let Astra reconstruct or clean the part model, then compare it against fit constraints before applying it to the showroom vehicle.

The web app should continue loading lightweight binary glTF (GLB) previews instead of heavy CAD models. Source CAD, mechanic documents, and generated replacement parts should live behind the scenes. The browser receives prepared per-assembly previews and swaps only the changed assembly into the exploded vehicle.

## Local application programming interface (API)

Design Mod exports:

- `GET /api/catalog` returns vehicles, editable regions, and styles.
- `POST /api/exports` accepts a validated vehicle and region/style selection, then returns export links for stereolithography (STL) files and a ZIP archive.
- `GET /api/exports/:id/:filename` regenerates the selected export file.

Repair flow:

- `POST /api/repair/chat` sends the active vehicle, message text, selected images, and chat context to the repair relay. The `repair_chat_generate` phase retrieves saved demo reference parts for confirmed Corolla repair selections.
- Static repair assets are served from `public/repair-assets`.

All browser-facing vehicle choices come from the shared catalog. Do not add a vehicle only in one page; add it to the catalog and prepare the matching repair asset folder.

## Asset pipeline

Prepared repair vehicles are stored under `public/repair-assets/<vehicle-id>/`.

Each prepared vehicle needs:

- `vehicle.glb` - lightweight web preview geometry.
- `manifest.json` - stable assembly IDs, exploded offsets, material metadata, and repair-family mapping.
- Optional repair libraries such as `repair-library.json` when saved CAD references are available.

The current prepared vehicles are:

- `corolla-prepared-demo`, with 43 assemblies and saved demo repair parts.
- `ferrari-458-demo`, with 131 assemblies and repair-family mapping.

More showroom vehicles are planned, but each one needs authorized source assets, preparation into stable exploded assemblies, and repair-family mapping before it is ready for the Fix Part demo.

## Important files

- `src/fix.js` - showroom page state, repair chat, part inspection, and scan modal integration.
- `src/fix-viewer.js` - Three.js vehicle rendering, showroom navigation, and exploded repair view.
- `src/scan-replacement.js` - simulated scan-to-custom-part flow.
- `src/part-variants.js` - replacement preview storage and demo CAD export.
- `scripts/prepare-vehicle.mjs` - general asset preparation.
- `scripts/prepare-ferrari-explosion.mjs` - Ferrari-specific exploded assembly preparation.
- `scripts/prepare-repair-library.mjs` - saved Corolla demo part generation.
- `FIX_PART.md` - repair workflow notes.
- `SCAN_REPLACEMENT.md` - scan-to-custom-part handoff.
- `ASSET_PREPARATION.md` - source asset and preparation notes.
- `OEM_MOUNTING.md` - projected document-grounded fit constraints.
