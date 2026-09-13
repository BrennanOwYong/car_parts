---
name: vehicle-schematic-sourcing
description: Find official vehicle geometry and public 3D scans for a rough exterior-part CAD concept. Use for hood, front bumper cover, front fender, wheel-arch trim, or side-mirror housing research when the workflow must request LiDAR only after source searches fail.
---

# Vehicle Schematic Sourcing

Use this skill to collect reference evidence for a rough exterior-part CAD concept. Supported parts are the hood, front bumper cover, front fender, wheel-arch trim or fender flare, and side-mirror housing.

## Source route

Read [references/official_sources.json](references/official_sources.json) first. Filter it to the confirmed make, model, and year. Keep this source order. Do not skip a stage.

Use sources in this order:

1. Check matching pre-indexed official documents. Then search official OEM body-repair pages, service diagrams, parts diagrams, and stated dimensions for the exact vehicle and part.
2. If OEM evidence cannot supply enough geometry, search the web for a public 3D scan of the exact vehicle and part.
3. If OEM evidence and a usable public scan are both insufficient, return a LiDAR request. State which surfaces, boundaries, and mounting areas the user must scan. Do not return CAD in that response.

Use the uploaded photo and known vehicle proportions as supporting evidence. They do not replace the ordered source checks. An exploded diagram is not a scale drawing. Use it as shape context only unless it states a value. Never label an inferred value as an OEM specification.

## Concept evidence

For each useful dimension, record its name, value, unit, broad tolerance, source URL or estimate basis, and confidence. Label it as one of:

- `official_dimension`: the source states the value directly;
- `public_scan_estimate`: estimated from a public 3D scan or its published views;
- `photo_estimate`: estimated from the uploaded image;
- `proportional_estimate`: estimated from a stated vehicle dimension or diagram relationship.

For each public scan, keep its title, URL, creator and platform when available, `sourceType=public_scan`, and the stated license or rights status. Public access does not grant reuse rights. Do not download, copy, modify, or redistribute a scan unless its license permits that use. If rights are unknown or restricted, use only the public page and images as visual references. Never describe a public scan as OEM, certified, exact, or dimensionally verified.

List material assumptions. Continue to rough CAD when official documents or a permitted public scan supply enough geometry for a recognizable concept. Use conservative tolerances. State that the result is a rough visual concept that is not suitable for fabrication or vehicle installation and does not guarantee fit. If the geometry remains insufficient after both search stages, return the LiDAR request instead.

## Catalog maintenance

Keep the existing catalog limited to free official documents with explicit dimensions. Runtime web search can use additional official exploded diagrams and public-scan pages without adding them to the dimension catalog. Update `verified_on` when catalog links are checked.
