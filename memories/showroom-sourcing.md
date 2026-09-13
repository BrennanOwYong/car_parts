# Showroom sourcing, 2026-09-13

Latest requested makes: Ferrari, Mazda, Toyota, Lamborghini. The earlier Tesla/Honda shortlist is no longer the user's preferred showroom lineup.

Only Corolla is a prepared repair asset. Do not describe downloading, preparation, or Astra processing of other cars as completed.

Signed-in Chrome opened the Mazda-3 download dialog successfully. Its free glTF archive is listed as 2 MB. Clicking Download navigated to Sketchfab's media host and Chrome displayed ERR_BLOCKED_BY_CLIENT. No model archive arrived. Do not work around the blocked download through alternate network access or browser internals. User has been asked to save archives manually to Downloads.

## Candidate sources

- Lamborghini Revuelto by ALIEEEN: https://sketchfab.com/3d-models/free-lamborghini-revuelto-cf52245eb68f48daa909c7ad2a8deaa3 — signed-in listing inspected. Free, 91.7k triangles, Creative Commons Attribution; author explicitly allows commercial/personal projects and prohibits selling the standalone model. Author comments describe modeling from reference photos. Strong candidate, but part separability is unknown until downloaded. Page left open in Chrome.
- Mazda RX-7 by wallon: https://sketchfab.com/3d-models/mazda-rx-7-45cb02e634ed477a9a04bb19813443f2 — search result describes original Blender modeling and texturing. Candidate only: browser timed out and current license/geometry have not been verified.
- Earlier Mazda-3: https://sketchfab.com/3d-models/mazda-3-0811f0d3785243a5ad05bd1b84457273 — live page 49.6k triangles, Creative Commons Attribution. Description appears to contain upload-form text and comments allege copying. Those comments are unverified; prefer a clearer original-author source.
- Toyota Supra MK IV (1994), Martin Trafas: https://sketchfab.com/3d-models/toyota-supra-mk-iv-1994-eb9bb1eb41db431cb078088ae1ce45f8 — discovered original-source candidate; license and geometry still need inspection. Existing Toyota Corolla remains usable locally.
- Existing Ferrari credit: https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6 — local asset attributed to vicent091036 via Three.js. No new Ferrari download occurred.

## Ferrari geometry discovery

Local ferrari.glb source hash: 43564baf3dcf4963adb287d3eeb86729ef966bd5aebf557cdd72117f4f050908.
The preparer finds 51 material-oriented primitives, including one body primitive of 80,566 triangles. Index-connected separation yields 23,633 pieces, so this is not an instant route to five clean exterior repair families. Existing main.js surfaceOverlays uses coordinate-selected triangles for front/sides/rear; these are visual overlays, not pre-separated repair panels. Do not relabel those overlays as complete exploded assemblies. Temporary inventory outputs were removed after recording these findings.

Follow-up: prepared the existing Ferrari with four wheel assemblies and stationary context, preserving all 358,788 triangles. This enables a real second showroom car but NOT five-family repair. Explicit registry repairNotice disables Send for Ferrari. Keep that limitation until actual body panels are separated and mapped. Mapping and inventory retained in asset-mappings for reproducibility.


Correction from deeper Ferrari inspection: the body is NOT irreducibly combined. Original-index connectivity was fragmented by duplicate seam vertices. Position-based connectivity at 1e-5 source units finds 1,030 surfaces including 22 body components; grouping tiny pieces by nearest major component within their original node produces 131 movable assemblies. Original attributes and all triangles are preserved. Old conclusion that only wheels can separate was incomplete. Rebuild script: design_mod/scripts/prepare-ferrari-explosion.mjs. Mapped recognizable body components n18 c12 frontbumper, c13 hood, c1/c3 frontfenders, c17/c18 mirrors. Front is negative Z; occupant left is positive X.

