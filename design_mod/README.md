# FORMA — body kit design studio

A local hackathon demo: choose the Ferrari 458, orbit the real GLB model, hover editable body regions, preview three styles of front lip / side skirts / rear spoiler, compare with stock, and export individual binary STL parts plus a ZIP manifest. The source calls its asset “458 Italia,” but it depicts an open-top vehicle; the UI identifies the series rather than claiming an exact year or trim.

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

## Implemented boundary

- This directory is independent of the existing Python repair relay and native iOS flow. Those files are unchanged.
- The landing mode cards show Fix part and Car accessory as coming soon. The exploded intro stays a placeholder.
- Vehicle selection loads a prepared catalog entry, not a live web-scraped engineering model. Ferrari replaced the tentative Corolla because a direct-download GLB was available in the Three.js example repository.
- The car asset is a visual mesh, not OEM CAD. Overall length is normalized to 4,527 mm; that does not establish attachment accuracy.
- The nine kit designs are original procedural concept profiles. They have thickness and closed geometry, but no measured mounting features. Do not describe them as fitted or plug-and-play vehicle parts.
- “Print” creates prototype STL files; it does not submit a print order. Skirts export separately for left and right. The manifest includes dimensions, mm units, Z-up orientation, and fit status.
- Pure, Sport, and Aero are original demo styles, not verified popularity rankings or replicas of branded aftermarket kits.
- Configurations live in browser memory. Generated downloads remain in server memory for one hour (up to 30 exports); a restart clears downloads. Re-export from the studio if a link expires.

## Integration contract

- `GET /api/catalog`: `vehicles`, `regions`, `styles`. Vehicle records carry identity, asset URL, dimensions, attribution, and fit status.
- `POST /api/exports`: `{ "vehicleId": "ferrari-458-demo", "selections": { "front": "sport", "sides": "subtle", "rear": "stock" } }`. At least one non-stock choice required. Returns export ID, selected parts, each STL URL, dimensions, and ZIP URL.
- `GET /api/exports/:id/:filename`: generated file; unknown or expired export returns 404.
- Invalid input returns 400; requests over 8 KB return 413. Only predefined vehicle, region, and style IDs are accepted.

`geometry.mjs` is shared by preview and server export. Scene geometry is in metres; exports convert to millimetres and Z-up with each part placed on z=0. The geometry tests weld coordinates for edge checks and verify finite vertices, closed edges, positive volume, and binary STL size. These checks establish mesh validity, not fit or manufacturing suitability.

## Adding a vehicle

See `CAR_LIBRARY.md` for researched candidates. Before enabling a car: obtain the authorized GLB, record attribution and reuse terms, inspect variant and geometry, normalize scale, map editable surfaces, and prepare matching modification shapes. The present region coordinates are Ferrari-specific. Adding a catalog record alone does not make another car compatible.

For a future measured version, replace concept profiles with part templates built around verified attachment geometry; retain the same preview/export identity. Keep engineering validation separate from visual asset metadata.

## FORMA landing experience

The homepage includes a full-screen Corolla scene tied to native page scrolling. It starts in an assembled side profile, rotates to a raised three-quarter view while the 43 assemblies separate, holds the exploded formation, then blurs behind the original Fix part / Design mod / Car accessory cards. The sequence reverses on upward scroll. Design mod retains the existing setup, configuration, and export flow; the other two cards retain their original disabled state.

The homepage scene is isolated in `src/landing.js`, with its reversible phase timing in `src/landing-motion.mjs` and scoped presentation in `src/landing.css`. It reads the animation embedded in `public/assets/corolla-exploded.glb`. It releases the render loop when leaving the homepage or hiding the tab, and renders only when the scroll pose changes. Reduced-motion settings keep the car assembled and the mode cards accessible.

Start the complete app with `npm run dev` (default port 8788); the plain Vite server does not provide the studio API.
