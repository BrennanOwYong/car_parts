---
name: vehicle-schematic-sourcing
description: Find free official vehicle documents that state dimensions for a confirmed vehicle and part. Use when a task needs mounting constraints, hole locations, body dimensions, or dimensional evidence before CAD generation. Exclude parts catalogs, general landing pages, and diagrams with no explicit measurements.
---

# Vehicle Schematic Sourcing

Use this skill to produce an evidence record for fit-critical geometry. A fit-critical feature is a hole, pin, clip, mating face, seal, datum, or boundary that controls whether the part fits the vehicle.

## Source route

Read [references/official_sources.json](references/official_sources.json) before web research. Filter it to the confirmed make, model, and year. Search those exact documents first. Use broader web search only after the indexed documents do not answer the question.

Use this order:

1. A free official service, collision, upfitter, or body-builder document that states a dimension.
2. Another direct official document that states the required value and exact vehicle applicability.
3. A measured 3D scan when no official source states the required value.

An exploded parts diagram is not a scale drawing. It can prove part names, part numbers, adjacency, and fastener context. It cannot prove length, tolerance, hole centre, thickness, or curvature unless the official page or document explicitly states that value.

## Evidence rules

For every proposed hard constraint, record:

- vehicle make, model, year, trim, body style, side, and market applicability;
- part name and official part number when available;
- dimension name, value, unit, tolerance, and datum definition;
- official URL, document title, revision or publication date, and page or section;
- whether the source states the value directly or only identifies the part.

Do not derive scale from a diagram image. Do not transfer a dimension across a model year, trim, body style, or market without explicit applicability. Do not treat a superseding part number as geometrically identical unless the official source says so.

When official dimensional evidence is incomplete, return the exact missing features. Request a focused scan of those features and the mating vehicle interface. Keep CAD blocked until each fit-critical constraint has official or measured evidence.

## Catalog maintenance

Add a source only when its domain belongs to the government or manufacturer and the direct page or file contains explicit dimensions. Do not add a search page, portal, parts catalog, or general manual index. Every catalog entry must set `can_prove_dimensions` to `true`. Verify the exact document and vehicle applicability each time.

Update `verified_on` when links are checked. Preserve access notes when a public site blocks automated clients or requires a free account.
