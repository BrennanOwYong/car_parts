# FORMA handoff

Updated 2026-09-13. Working branch: `codex/repair-5096d2d`, based directly on `5096d2d` (Add FORMA scroll-driven exploded landing page). No publish or push has been performed. Earlier repair changes were preserved before moving the work onto this base.

## Entry and design direction

Run `npm run dev` from `design_mod/`; open http://localhost:8788/ . The first screen remains the base commit's scroll-driven exploded Corolla scene. Explore reveals the mode cards. Fix part now links to `/fix.html`; Design mod retains the Ferrari studio. The repair page follows the same charcoal/cool-metal direction, quiet typography, pale controls and restrained borders. The earlier green design has been replaced, not retained as an alternate theme.

## Shared asset source

`vehicle_model_catalog.json` is the canonical vehicle registry. `design_mod/asset-library.mjs` exposes its local identities, requested repair cars and prepared-asset paths. `catalog.mjs`, the landing, standalone Corolla, design studio and repair catalog consume this source. `repair_chat.py` reads the same registry when validating the selected car.

The Corolla animated source serves the original landing choreography. The prepared repair derivative preserves its geometry/materials and explicitly mapped assemblies. Both belong to `corolla-prepared-demo`; the derivative exists to support per-assembly highlighting and explosion offsets. The showroom loads exact assembled repair geometry into a single 3D world. Models stand side by side on one floor and horizontal gestures move the camera; no thumbnail or slide rendering remains.

Present assets:

- Ferrari design demonstration (`/assets/ferrari.glb`), with source attribution in the registry.
- Original Corolla animation (`/assets/corolla-exploded.glb`).
- Prepared Corolla repair asset and manifest (`/repair-assets/corolla-prepared-demo/`), 43 assemblies. Source rights remain unverified; explicitly labeled local demonstration.

Not yet present: Tesla Model Y 2021, Tesla Model S 2013, Mazda 3 and Honda Civic 2022. Their source entries remain in the registry but are not rendered in the showroom until prepared. Sketchfab sign-in succeeded, but Model Y's download redirects to a Chrome-blocked media destination (ERR_BLOCKED_BY_CLIENT). Do not claim these binaries exist or circumvent the browser restriction. Resume preparation when the user supplies downloaded archives or resolves access. See `design_mod/ASSET_PREPARATION.md` for the inspection/mapping commands and required attribution.

## Repair interaction

1. Landing Fix part card opens a continuous showroom row of actual assembled 3D models on one shared dark background. Horizontal scrolling, arrows and keyboard navigation move through the installed cars. There are no boxed vehicle cards, status summaries, helper captions, separate Explore button or showroom footer. The showroom is viewport-height with no vertical scrolling; subtle arrows flank the model name. Click the car itself to enter repair.
2. Select a prepared car to move its visual from center toward the left, reveal the conversation panel on the right, and separate the interactive model to 50%. The explosion slider remains adjustable. Phones narrower than 600 pixels stack the conversation below the car.
3. Attach or paste up to six images, remove images, describe damage, and press Send. Photos are transmitted only on Send or explicit generation confirmation.
4. Astra returns a full current selection across hood, front bumper cover, front fender, wheel-arch trim and side-mirror housing. The server resolves family and side to real assembly identifiers. Unavailable geometry is identified in the selection, never invented. Unknown side asks for clarification rather than flashing both sides.
5. Resolved assemblies pulse red; reduced-motion preference uses steady red. Removing selections restores original materials. Further conversation updates the current map.
6. Confirm selected parts to request separate fitted and exploded OpenSCAD concept files. These are approximate visual concepts; dimensional fit and mounting have not been verified.

`fix.html`, `src/fix.css`, `src/fix.js`, and `src/fix-viewer.js` own this experience. `repair-catalog.mjs` validates real installed manifests. `server.mjs` serves the repair endpoints and invokes `repair_worker.py` through `repair-service.mjs`. `repair_chat.py` validates photos, conversation, model identity, family/side mapping and output. `astra_relay.py` sends the actual Astra request. The older root repair app remains independently runnable; it is not the FORMA handoff destination.

## Credentials and limits

Root `.env` holds `OPENAI_API_KEY`; never commit, print or embed it in the browser. The status endpoint reports only a boolean. The user added a key and the browser detected it. That establishes configuration, not a successful live analysis or generation. No simulated model-service success is used as evidence.

A fresh Python worker loads the environment per request. Requests use `gpt-6-astra`. Failed requests preserve photos and draft text for retry. Confirmation is disabled for changed photos, unsent text, unresolved sides or missing selections.

## Verification and next step

See `tests/TEST_REPORT.md` for exact current results and limitations. All deterministic tests are owned by the testing agent. `FIX_PART_PLAN.md` records the user-review breakpoints. After automated checks, show the live page in Codex's built-in browser and ask for subjective feedback using SETUP / WHAT TO DO / WHAT YOU ARE JUDGING / ALREADY VERIFIED BY AGENT.

The remaining external dependencies are the four model downloads and a successful live Astra review/generation with actual damage imagery. Do not describe the complete four-car task as finished before those steps.

## Implementation references

Exact official documentation links are preserved in `FIX_PART_PLAN.md`, `design_mod/FIX_PART.md`, and `design_mod/ASSET_PREPARATION.md`.





## Latest text cleanup

The fix page now uses a single full-size make/model/year title. Source-credit and local-demonstration captions, footer copy, helper paragraphs, photo-count captions and connection-status microcopy were removed. Provenance remains in the canonical registry and asset documents. Essential controls, actual conversation, errors and damage evidence remain. The confirmation action explicitly requests CAD concepts; output files retain their concept warning.

Car-to-car navigation is currently unavailable because only one prepared model is installed. The latest Downloads inspection still found none of the four requested model archives. Do not claim navigation across four models is complete, and do not add duplicate models under false identities.

## Ferrari showroom addition
Two real showroom assets now exist: Ferrari 458 and Toyota Corolla. Ferrari uses existing bundled geometry, with four separable wheels and stationary remaining body; it has no mapped repair families. Selecting it explains this and disables Send. Corolla retains full existing repair behavior. Mazda and Lamborghini archives are still absent; Chrome downloads remain blocked. Do not report those models as downloaded or processed.


## Functional scan replacement demo
See design_mod/SCAN_REPLACEMENT.md. User requested a functional rough implementation and explicitly waived interaction tests for this increment; build check only. Select one assembly then Scan replacement. Demo adapters simulate capture/reconstruction, optional phone photo stays local, one part changes in repair/showroom with saved variant and edited CAD annotation. No live LiDAR or Astra reconstruction. Existing Astra damage-chat remains separate.


## Ferrari explosion correction
Supersedes all earlier wheel-only notes: Ferrari now has 131 moving assemblies and mapped hood/bumper/fenders/mirror surfaces. Geometry seam analysis reveals real separated panels. Every group moves radially including height. No source triangles cut/deleted. Current task follows user preference for build-only checks and visual feedback; do not cite old five-group tests for this new asset.

