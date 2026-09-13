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

- `POST /api/repair-chat` sends the active vehicle, message text, selected images, and chat context to the repair relay.
- `POST /api/repair-chat/generate` retrieves saved demo reference parts for confirmed Corolla repair selections.
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
