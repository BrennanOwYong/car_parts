# Scan replacement engineering handoff

The interactive flow is implemented in `src/scan-replacement.js`. Select a single assembly in the repair viewer, choose Scan replacement, optionally capture a phone photo, start the sample scan, inspect/download the result, and apply it. The same saved variant appears in the showroom and repair viewer. The edited annotation downloads the current part's text-based CAD surface.

## Deliberate demo boundaries

`DemoDepthCapture.capture` returns a simulated capture record. It does not read a depth sensor. The optional photo remains local and is used as a visual reference in the scan dialog, not reconstructed. `DemoAstraReconstruction.reconstruct` uses deterministic source-mesh deformation to provide a working preview; it does not call Astra or claim to recover a shape from the photograph. Demo mode is visible in the scanner heading.

Replace these adapters with native depth capture and a server-side reconstruction service. Pass the immutable vehicle and part identity, scan units, calibrated scale, coordinate frame and document constraints through that boundary. Astra may interpret the supplied evidence and constraints; a geometry engine must construct and validate the CAD result. Never infer screw-hole dimensions from a single photograph.

The hardcoded 25 mm visual envelope is marked at the reconstruction site as a future document-parsing input from mechanic-supplied manufacturer/fitment documents. It is not a mounting validation. Both fixture styles remain within this displacement envelope by construction.

## Preview/version relationship

`part-variants.js` creates a replacement for only the selected assembly, retaining its stable part identifier and original explosion offset. It stores a small variant descriptor per vehicle/part in browser local storage; no CAD needs to load with the page. Both the downloadable GLB and OpenSCAD surface are generated from the same replacement vertices. These are surface prototypes, not fabrication-ready solids.

Production should persist immutable CAD and generated preview asset versions server-side, with source hashes and document revisions. Replace the fixture descriptor with those asset references. Preserve original assemblies for undo/version comparison and validate compatibility before applying a new revision.

## References consulted 2026-09-13

- https://threejs.org/docs/pages/GLTFExporter.html — `parseAsync(scene, {binary:true})` returns the browser preview buffer; installed Three.js r180 signature also inspected.
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture — `input type=file accept=image/* capture=environment` requests the outward-facing camera on supported devices; desktop browsers may show a file picker.

Latest user explicitly requested functional implementation with a build check, leaving interaction testing to them. No sensor/reconstruction accuracy claims are supported by this demo.
