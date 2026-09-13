# FORMA repair continuation learnings

- The requested visual base is 5096d2d on origin/main, not brennan's b7d15f6. Fetch was required before that object existed locally. The repair continuation branch is codex/repair-5096d2d.
- In this OneDrive Windows checkout, git stash --include-untracked saved the work but failed to remove locked/untracked directories; tracked edits stayed in place and the subsequent switch failed. Verify the stash exists before restoring only explicitly preserved tracked paths. Do not assume a reported saved stash means the working tree is clean.
- Sketchfab sign-in succeeds in Chrome and the Model Y source confirms a free attribution license. The glTF Download button redirects to sketchfab-prod-media.s3.amazonaws.com, where Chrome displays ERR_BLOCKED_BY_CLIENT. No file appeared in Downloads. This is not a successful asset download. Do not bypass the blocked destination.
- Chrome's accessibility snapshot uppercases button labels, but Playwright's DOM snapshot shows Download in title case. Exact locators must use the DOM label rather than CSS-transformed visual casing.
- The shared registry has two local variants for Corolla: the original animated model for the 5096d2d landing choreography and a normalized derivative for repair-part offsets/highlighting. Keep both tied to the same vehicle identity and source provenance.

## Showroom rendering and transition timing

- The shared showroom now renders on scene/camera changes instead of redrawing a static scene continuously. Shadows update when models load, separate or return to assembled. A fresh test browser reached the model within 10 seconds after this change; the earlier startup had timed out. This observation does not establish general performance numbers.
- Three.js r180 WebGLShadowMap supports autoUpdate=false with needsUpdate=true for explicit refresh. Checked installed source; upstream reference: https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgl/WebGLShadowMap.js
- A relocated live canvas needs its initial rectangle committed before setting the transition destination. Reading getBoundingClientRect after append commits that layout; do not also set the destination redundantly in the later asset-load completion callback.
- Wheel momentum events are grouped until180ms quiet so a single gesture cannot skip several vehicle positions.

Scan prototype: flatten source mesh transforms into assembly-local coordinates before deformation so the replacement preserves original assembly placement and explosion offsets. Export GLB and SCAD from the same vertices. Do not export entire viewer groups with runtime userData (baseChildren/material bookkeeping); export clean Mesh nodes. Simulated adapters are explicit and phone reference photos remain local.

