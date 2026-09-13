# FORMA

Public demo: https://forma-car-parts.brennanowyong.chatgpt.site

See the damage. Understand the car. Generate the part.

FORMA is a car repair and customization prototype that turns vehicle photos, three-dimensional (3D) models, and original equipment manufacturer (OEM) engineering references into an interactive repair workflow. Instead of treating a car as one visual object, FORMA uses Astra to break the vehicle down into distinct assemblies: hood, bumper cover, fenders, mirrors, wheel arches, chassis-adjacent body sections, and other visible part families. The user can explore the car in an exploded view, identify what is damaged, and focus only on the part that needs attention.

The product vision is a physical artificial intelligence (AI) repair agent for cars. A user takes a picture of damage, chats briefly with the platform, and Astra maps the image to the correct section of the vehicle model and schematic. From there, FORMA can guide the user toward a replacement or custom computer-aided design (CAD) file, so the repair flow becomes visual, conversational, and grounded in engineering references.

## Hackathon Submission Answers

This section is written so a judge, teammate, or large language model (LLM) can read the repository and directly answer the submission questions.

### Description - what does it do?

FORMA turns cars into interactive 3D repair and customization experiences. A user can select a vehicle, open it into an exploded assembly view, inspect individual parts, upload or paste damage photos, and see which section of the car is affected. The long-term goal is photo-to-CAD for vehicle repair: take a picture of damage, identify the affected component, ground the result in OEM specifications and known vehicle geometry, then generate or retrieve a printable stereolithography (STL) replacement or prototype part.

The key idea is that the agent does not understand the car only as a whole object. It learns the car by taking it apart. The exploded view visually separates assemblies so Astra can reason about part boundaries, adjacency, mounting context, and repair scope. That same decomposition gives the user more control: they can customize one body section, replace only the damaged part, and avoid paying for broad body work when a smaller targeted repair is enough.

This matters economically as well as technically. Better visual understanding translates into saved money, saved materials, less physical effort, and less mental effort. FORMA aims to direct resources only toward the part that is damaged, rather than replacing or repairing larger sections of the car by default.

### How did you use Astra?

We used Astra in Codex to build FORMA from concept to working prototype. Astra helped design the 3D interface, organize vehicle meshes into exploded assemblies, implement configurable body-kit geometry, export prototype STL files, create repair workflows, research references, debug the experience, and validate geometry/export behavior.

The deeper Astra use case is agentic engineering. Astra is being used as a visual and research agent that can look at car images, inspect vehicle models, read OEM spec sheets or mechanic references, and run its own research loop to ground observations in as much truth as possible. Camera images alone have limits: a photo may show a dent or crack, but it may not reveal exact dimensions, hidden mounting points, or the full engineering context. FORMA strengthens the photo understanding with vehicle models and OEM references, so the platform can map visible damage to a specific schematic section instead of guessing from pixels alone.

In the projected repair flow, Astra:

1. Reads the user's damage photo and chat context.
2. Identifies the vehicle and likely damaged assembly.
3. Compares the photo against the prepared 3D vehicle model.
4. Uses exploded-view segmentation to distinguish neighboring parts.
5. Checks OEM or mechanic references for engineering constraints.
6. Generates or retrieves a CAD/STL concept for the affected part.
7. Renders the part, compares it back to the visual evidence, and iterates toward a closer match.

This is why FORMA fits both Best example of Agentic Engineering and Best example of Visual Understanding. The agent is not only labeling an image. It is using vision, research, geometry, and engineering constraints to move from "this looks damaged" toward "this is the specific part, this is how it relates to the rest of the car, and this is the CAD artifact needed for repair or customization."

### Best project tracks

- Best example of Agentic Engineering
- Best example of Visual Understanding

## Pitch

Car repair and car customization both have the same bottleneck: normal people do not think in part numbers, mounting envelopes, or CAD files. They point at a dent, a cracked bumper, or an aftermarket part and ask, "Can I fix this?" or "Will this fit?"

FORMA turns that question into a visual workflow:

1. Pick the car in a showroom.
2. Open it into an exploded view so the car is understood part by part.
3. Upload damage photos or scan a physical part.
4. Astra maps the visible problem to the correct assembly or schematic section.
5. The affected part is highlighted on the 3D model.
6. The user confirms the part and retrieves a reusable CAD reference or applies a custom replacement preview.

The pitch is that Astra can bridge messy real-world car photos, OEM documentation, 3D model segmentation, and structured repair assets. The user experience stays as simple as taking a picture and chatting, while the system underneath can evolve toward document-grounded fit checks and manufacturable geometry.

## What the Demo Shows Today

- A full-screen FORMA landing page based on the original exploded-view commit.
- A Fix Part showroom at `http://localhost:8788/fix.html` with horizontal vehicle selection.
- Prepared Toyota Corolla and Ferrari 458 demo assets using shared catalog metadata from `vehicle_model_catalog.json`.
- A 43-assembly Corolla exploded model and a 131-assembly Ferrari exploded model.
- A repair workspace where the chosen vehicle moves left, opens into a partial exploded view, and leaves room for the Astra chat on the right.
- Image upload and paste support for repair conversations.
- Mapping of damage chat results into five exterior repair families:
  - hood
  - front bumper cover
  - front fender
  - wheel arch trim or fender flare
  - side mirror housing
- Red pulsing highlights for mapped damage families.
- Saved Corolla reference parts for the demo repair flow: hood, bumper, left and right front fenders, and left and right mirror housings.
- A scan-to-custom-part demo path where the user can select an individual assembly, simulate a phone scan, generate a lightweight Three.js [browser 3D rendering library] replacement preview, and swap that part into the exploded view.

## Projected Product

FORMA is projected to become two connected workflows.

The first workflow is damage-to-repair. A user uploads photos of vehicle damage, then talks with Astra until the visible damage is mapped to the correct exterior assemblies. Once confirmed, FORMA returns the right replacement references, drawings, and repair assets for the affected part families.

The second workflow is scan-to-custom-part. A user selects one assembly on the exploded car, scans a physical aftermarket part with a phone, and lets Astra convert that scan into a CAD-ready replacement. FORMA then checks the new part against fit constraints, swaps the preview into the vehicle, and annotates the edited part with a link to the CAD file.

The browser should not load heavy CAD files every visit. The intended asset pipeline is:

1. Store source CAD and fit references on the backend.
2. Generate lightweight Graphics Language Transmission Format (glTF) binary (GLB) previews for the web showroom.
3. Keep each exploded vehicle separated into stable, clickable assemblies.
4. Replace only the edited assembly when a user creates or imports a custom part.
5. Persist the edited preview and CAD reference together so the same part does not need to be regenerated each time.

## Fit and Documentation Roadmap

The demo currently uses visual meshes and saved surface-reference CAD outputs. The projected production flow should ground part fit in original equipment manufacturer (OEM) service information, mechanic fitment documents, or verified part drawings.

The next implementation layers are:

- Parse vehicle and part documents into structured fit constraints.
- Track mounting hole locations, edge offsets, bounding envelopes, and attachment notes per part family.
- Generate replacement CAD once, then reuse that output across showroom previews and downloads.
- Let the user upload or scan aftermarket parts and compare them against those constraints.
- Flag fit conflicts visually on the exploded model before the user exports or orders anything.
- Add a mechanic review step before any manufacturing or installation claim.

The Corolla demo library is the first local example of reusable reference parts. It is meant to show the direction of the asset pipeline, not the final engineering-grade geometry system.

## Architecture

The current app lives mostly in `design_mod`.

- `design_mod/server.mjs` runs the local app on port 8788.
- `design_mod/src/fix.js` controls the showroom, repair chat, part selection, and scan modal wiring.
- `design_mod/src/fix-viewer.js` renders the showroom vehicles and exploded repair view.
- `design_mod/src/scan-replacement.js` simulates phone scanning and Astra-assisted part reconstruction for the demo.
- `design_mod/src/part-variants.js` stores lightweight replacement previews and exports matching demo CAD files.
- `design_mod/asset-library.mjs` reads the shared vehicle catalog.
- `vehicle_model_catalog.json` is the source of truth for vehicle IDs, prepared assets, and repair manifests.
- `repair_chat.py`, `astra_relay.py`, and `repair_worker.py` support the Astra repair conversation path.
- `repair_library.py` retrieves saved demo parts from the local Corolla repair library.

The older root-level `http://localhost:8787` relay still exists as legacy repair work. The active showroom and pitch demo run from `design_mod` on `http://localhost:8788`.

## Run the Demo

Requires Node.js 20.19 or later and Python 3. The OpenAI application programming interface (API) key should stay in `.env`; do not place it in browser code.

```sh
cd design_mod
npm ci
npm run dev
```

Open `http://localhost:8788`.

Useful routes:

- `http://localhost:8788/` - FORMA landing page.
- `http://localhost:8788/fix.html` - Fix Part showroom.
- `http://localhost:8788/fix.html?vehicle=ferrari-458-demo` - Ferrari repair workspace.
- `http://localhost:8788/fix.html?vehicle=corolla-prepared-demo` - Corolla repair workspace with saved demo parts.

Build check:

```sh
cd design_mod
npm run build
```

## Repository Notes

- `design_mod/FIX_PART.md` explains the current repair page behavior.
- `design_mod/SCAN_REPLACEMENT.md` explains the scan-to-custom-part demo and the planned real reconstruction path.
- `design_mod/ASSET_PREPARATION.md` documents how vehicle assets are prepared into exploded views.
- `design_mod/OEM_MOUNTING.md` tracks the direction for OEM and mechanic-document fit constraints.
- `memories/showroom-sourcing.md` records model sourcing attempts and vehicle library notes.
- `HANDOFF.md` captures the broader implementation handoff.

## Current Asset Status

Prepared demo vehicles:

- Toyota Corolla demo asset, prepared into 43 assemblies.
- Ferrari 458 demo asset, prepared into 131 assemblies.

Vehicles still projected for the broader showroom library include Mazda, Lamborghini, Tesla, and additional repair-ready Toyota variants. Those require authorized downloadable assets, preparation into stable exploded assemblies, and repair-family mapping before they should be treated as ready in the demo.
