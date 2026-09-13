# From styling to a mountable body kit

Research updated 2026-09-13. Current user decision: **Ferrari 458 visualization only**. The current implementation is a connection study, not an installation-ready kit.

## What the research supports

| Reference | What it establishes | Application to FORMA |
| --- | --- | --- |
| [Liberty Walk Ferrari 458](https://libertywalk.co.jp/bodykit/ferrari-458/) | Separate full-bumper and lip-kit families, plus GT-wing and ducktail options, exist for the 458. | Keep distinct front, side and rear design families. Do not claim our original designs are branded kits or popularity-ranked products. |
| [MEC Design Ferrari 458 program](https://www.mecdesign.de/new/pricelists/en/Ferrari_458_Pricelist_International_Complete.pdf) | Certain listed Italia/Spider add-ons use adhesive mounting to the original bumper; application excludes the Speciale. | A real fitment must specify exact variant and attachment method. A render of the 458 series is not sufficient. |
| [Maxton installation manuals](https://maxtondesign.com/pages/manuals) | Different products have different assembly instructions: bolted splitters, bonded caps, brackets and clips. [Front splitter instructions](https://maxtondesign.com/data/include/cms/manuals/Front_Splitter_Manual.pdf) show bolts with washers and nuts. | Demonstrate a through-bolt, washer and backing-plate concept, but do not reuse another kit's bolt pattern or torque. |
| [Maxton Corolla XII sedan spoiler cap](https://maxtondesign.com/products/spoiler-cap-toyota-corolla-mk12-sedan) | A sedan-specific ABS cap is supplied with 3M tape. | Bonded cap is a separate future attachment family, not an interchangeable substitute for a structural wing mount. |
| [Formlabs end-use guidance](https://formlabs.com/support/End-use-applications/) | Print process, post-processing, orientation and environmental/stress tests affect suitability. | A manifold STL proves geometric closure, not strength, weather resistance or road safety. |
| [Modix BIG-180X](https://www.modix3d.com/lp/modix-180x-redesign.html) | Large-format printing is used for body-kit and bumper projects. | Full-size panels can need industrial equipment or tooling. Our long skirts still exceed many printers; no automatic split-and-glue promise. |

These references are product/method research, not redistributable aftermarket CAD. No verified, openly licensed Ferrari mounting-pattern CAD was established by this research. Source product photos and meshes were not copied into the original modification geometry.

## Implemented connection study

- Original, thinner concept profiles for the three styles in each mod region.
- Four actual Ø6.6 mm concept clearance holes per individual part, including each side skirt. Holes retain their diameter after vehicle-specific scaling.
- Interactive metal M6-example bolt with cosmetic thread, upper washer, isolation pad, illustrative metal backing plate, lower washer and locking nut.
- Independent fastener-explosion close-up, plus hardware display on the main car.
- Original seven-section illustrated assembly field guide, matched to the selected car and exported parts. The monochrome, flat-pack-manual-inspired edition uses actual part outlines, hardware drawings with quantities, large step numbers, insertion arrows and circular close-ups. Includes BOM, tools, six illustrated bench steps and engineering-release checklist. No manufacturer artwork or branding is reused.
- Exported STL contains the concept body part with holes. Metal fasteners, backing plates and pads are not printable kit files. All hardware sizes beyond the modeled sample are unapproved examples.

The backing plate demonstrates load spreading but is **not** a load calculation. The current hole locations do not match measured OEM holes. The vehicle's actual mounting substrate is not modeled. Clip-only retention has not been designed or validated.

## Attachment families to develop next

1. **Existing-fastener adapter** — scan a specific OEM interface, preserve its approved fasteners and create a vehicle-specific adapter; validate the complete new load path.
2. **Through-bolted flange** — measured contact surface, verified backing/reinforcement, defined sealing and specified metal hardware. The current visualization demonstrates this principle only.
3. **Bonded cap** — conformal contact surface and a validated automotive adhesive system, including preparation, environmental and service-life requirements.
4. **Locator clip + mechanical retention** — use clips for positioning while separately engineering retention; do not assume a printed snap-fit can retain an aerodynamic part at road speed.

## Data required for a real self-installation release

Exact model year/trim; body variant; surface scan; datum and hole-center dimensions; material/section of the mounting substrate; backside access; permissible attachment zones; OEM removal procedure; clearance to sensors, wiring, lamps, heat and moving parts; hardware grade and length; thread engagement; approved torque/locking method; seal/corrosion system; printed material and process; load, pull-out, vibration, fatigue and environmental validation; local road-use review.

Keep `fitVerified`, `vehiclePatternVerified` and `roadUseApproved` false until the corresponding evidence exists. Replace the bench guide with a vehicle-specific installation document only after release. Do not turn illustrative coordinates into a drilling template.

## Visual car library, separate from printable parts

The studio now has actual Ferrari 458, Toyota Corolla 2020 and Porsche 911 Carrera 4S assets, with 34, 43 and 36 visual assembly groups respectively. See [asset credits](public/ASSETS.md) and [further car candidates](CAR_LIBRARY.md). A photorealistic car mesh is useful for configuration; it is not a measured attachment surface or a license to reproduce a branded aftermarket kit.
