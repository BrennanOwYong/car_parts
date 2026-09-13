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

## Implemented boundary

- This directory is independent of the existing Python repair relay and native iOS flow. Those files are unchanged.
- The landing experience is separate from the studio. Fix part and Car accessory remain coming soon.
- Vehicle selection loads three prepared, locally stored assets, not live web-scraped engineering models. Make/model fields and collection cards stay synchronized. In-memory build selections and paint are preserved separately per car.
- Ferrari, Corolla and Porsche expose 34, 43 and 36 visual assembly groups. Connected source islands move intact; unmapped windows and other non-mod surfaces do not select modifications. Explosion is reversible, and selected mod parts follow their corresponding assembly offsets.
- The car assets are visualization meshes, not OEM CAD. Scaling to an overall-length reference does not establish attachment accuracy. See each catalog record for identity and scale caveats.
- Three original styles per region per car (27 combinations) have thinner solid profiles and actual Ø6.6 mm concept through-holes. Hole positions are not measured OEM patterns. Do not describe these as fitted or plug-and-play vehicle parts.
- The hardware close-up illustrates purchased metal bolts, washers, backing plates, locking nuts and pads. These are not printable structural fasteners. The seven-section guide covers the bench demonstration and lists missing engineering-release checks, not an on-car installation procedure. See `MOUNTING_RESEARCH.md`.
- “Print” creates prototype STL files; it does not submit a print order. Skirts export separately for left and right. The manifest includes dimensions, mm units, Z-up orientation, and fit status.
- Pure, Sport, and Aero are original demo styles, not verified popularity rankings or replicas of branded aftermarket kits.
- Configurations live in browser memory. Generated downloads remain in server memory for one hour (up to 30 exports); a restart clears downloads. Re-export from the studio if a link expires.

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

The homepage includes a full-screen Corolla scene tied to native page scrolling. It starts in an assembled side profile, rotates to a raised three-quarter view while the 43 assemblies separate, holds the exploded formation, then blurs behind the original Fix part / Design mod / Car accessory cards. The sequence reverses on upward scroll. Design mod retains the existing setup, configuration, and export flow; the other two cards retain their original disabled state.

The homepage scene is isolated in `src/landing.js`, with its reversible phase timing in `src/landing-motion.mjs` and scoped presentation in `src/landing.css`. It reads the animation embedded in `public/assets/corolla-exploded.glb`. It releases the render loop when leaving the homepage or hiding the tab, and renders only when the scroll pose changes. Reduced-motion settings keep the car assembled and the mode cards accessible.

Start the complete app with `npm run dev` (default port 8788); the plain Vite server does not provide the studio API.
