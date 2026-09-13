# Immersive learning: geometry provenance and remaining assets

Updated 2026-09-13. The user requires exact Porsche, Ferrari, and Toyota engine assets. They asked us to select the year/variant.

## Selected engine references

| Course | Selected reference | Required engine | Current state |
|---|---|---|---|
| Porsche | 2010 911 Carrera 4S, 997.2 | 3.8 L naturally aspirated direct-injection flat-six | Exact detailed assembly absent |
| Ferrari | 2012 458 Spider | 4,497 cc naturally aspirated 90° V8 with direct injection | Exact detailed assembly absent |
| Toyota | 2020 Corolla LE, US market | 1.8 L 2ZR-FAE with Valvematic | Exact detailed assembly absent |

Manufacturer references:
- [Porsche 997 development](https://newsroom.porsche.com/en/history/porsche-911-seven-generations-part-6-type-997-16489.html)
- [Ferrari 458 Spider](https://www.ferrari.com/en-UG/history/garage/2011/458-spider)
- [Toyota 2020 Corolla powertrains](https://pressroom.toyota.com/driving-and-design-highlight-the-all-new-2020-toyota-corolla/)

These are course reference choices. The existing creator-supplied exterior meshes have not been verified against the selected model years/trims. Do not claim exact OEM dimensions, trim equipment, or internal specifications from those meshes.

## Implemented source-part studies

Each study clones the chosen car’s intact visual assemblies, with original vertex positions, normals, UVs, and available texture/material data. No simplified wheel, brake, panel, glass laminate, lamp, seat, or engine is substituted. Physically based material adjustments affect presentation only.

- Porsche: `public/assets/porsche-911-carrera-4s.glb` (source 652,658 car triangles; 36 visual groups), Karol Miklas / Lionsharp Studios via PlayCanvas; CC BY-SA 4.0.
- Ferrari: `public/assets/ferrari.glb` (358,788 triangles; 34 visual groups), vicent091036 via Three.js. Existing asset license unverified. The creator called it Italia; geometry is open-top. No new Ferrari download was made.
- Corolla: `public/assets/corolla-exploded.glb` (205,990 triangles; 43 visual groups), ItsDiyor; CC BY 4.0 as recorded in the existing catalog.

These are polygonal render assets, not native CAD solids. Source detail is the fidelity limit. In particular the Ferrari has no source texture maps; material polish cannot create missing tire carcasses, fasteners, lamp electronics, or engine internals.

## Engine research and exclusions

- A real V8 STEP-derived viewer mesh by ghanimm and inline-four IGES-derived viewer meshes by ankita1 were found under CC BY 4.0 on Cad Crowd. They are **excluded**, since they are generic and do not meet the exact-engine requirement. No generic CAD ships in the app.
- A detailed 1983 Porsche 911 SC engine with 915 gearbox by PROKOP exists on Sketchfab, but it is a different engine/generation and a store asset. It is **excluded**. No gated download was bypassed.
- Marketplace car models may include an engine-bay exterior while lacking pistons, rods, crankshaft, valves, and other internals. Such a listing alone is not enough to claim a complete engine course.
- No verified, freely downloadable complete engine assembly matching the selected three variants was established during this research. No asset purchases, account registrations, or messages to creators were made.

## Completion requirements

Acquire or commission a licensed, identity-verified assembly for each selected engine. A GLB/glTF with named components, materials, and texture maps is the preferred web delivery format; native STEP/IGES plus a tessellation is also usable. Confirm the named block, heads, crankshaft, rods, pistons, valve train, intake/exhaust, cooling, and lubrication components are actually represented before exposing their hotspots or kinematic animations. Native CAD is necessary for any claim of measured engineering geometry.

Until those files are available, the engine page explicitly says exact CAD is pending. Manufacturer-based text and cycle-rate calculations are available, but no generic or invented engine geometry is rendered.
