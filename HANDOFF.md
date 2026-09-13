# Project handoff

## Current state

`main` is the source baseline. This branch starts from commit `1eb32d2`.

The repository now has two related demonstrations:

- `design_mod/` is the FORMA design studio. It contains a Ferrari visual model and a Corolla exploded GLB asset.
- The root web application is the Astra damage-repair concept. It maps photo-visible damage to five rough exterior CAD families and generates OpenSCAD concepts after user confirmation.

## Astra repair flow

1. The user uploads or pastes one current-car image and describes the repair need.
2. Astra identifies the vehicle in conversation. The user can correct or add make, model, year, side, and damage information in plain text.
3. When the conversation contains a repair request, Astra returns visible-damage candidates. Each candidate has a normalized image anchor and one supported CAD family.
4. The UI draws a pin and arrow from each damage area to the proposed CAD part name. It shows candidates in a confirmation carousel.
5. The user clears incorrect candidates and selects **Generate CAD for confirmed parts**.
6. Astra returns separate fitted and exploded OpenSCAD concepts for each confirmed part.

The supported families are hood, front bumper cover, front fender, wheel-arch trim or fender flare, and side-mirror housing.

## Vehicle reference-model catalog

`vehicle_model_catalog.json` registers external reference meshes. It does not download or redistribute them. The current entries are all marked CC BY 4.0 and carry source URLs and creator names:

- Tesla Model Y 2021;
- Tesla Model S 2013;
- Mazda 3, model year not stated by the source;
- Honda Civic 2022.

During repair assessment, the server gives Astra only catalog entries that match the candidate make, model, and year. The result returns `referenceAssetId`; the browser resolves this to a displayed source link, license, and creator.

Important limits:

- A reference mesh is not an OEM CAD part or a fabrication file.
- Do not add a downloaded mesh until its license permits the intended use and the asset object hierarchy has been checked.
- A full-car mesh may need manual or scripted segmentation before it can produce a true five-part exploded view.
- The current OpenSCAD output is a rough visual concept. It is not safe for vehicle installation.

## Main files

- `astra_relay.py`: server, Astra prompts, response validation, source matching, and model-catalog matching.
- `web/app.js`: image preparation, conversational states, damage pins/arrows, confirmation carousel, and downloads.
- `web/index.html` and `web/styles.css`: repair review and output UI.
- `vehicle_model_catalog.json`: approved external reference metadata.
- `skills/vehicle-schematic-sourcing/references/official_sources.json`: vehicle dimension source catalog.
- `design_mod/`: separate FORMA 3D design studio.

## Run and verify

```sh
cp .env.example .env
# Set OPENAI_API_KEY in .env
./astra_relay.py

python3 -m unittest discover -s tests -p 'test_*.py'
node tests/test_photo.mjs
./astra_relay.py --self-test
```

Open `http://localhost:8787` for the Astra repair app. Run `npm install` then `npm run dev` in `design_mod/` for the FORMA studio.

## Recommended next work

1. Download one license-cleared full-car mesh for a target vehicle. Record the exact download date, license, creator, checksum, and object hierarchy.
2. Add a deterministic Blender or Three.js segmentation process for the five supported exterior families. Store the generated exploded GLB separately from the source mesh.
3. Add vehicle-specific reference entries only after visual validation against a known make, model, year, and body style.
4. Improve the Astra repair prompt to ask for an additional angle when the damaged area or vehicle identity is uncertain.
5. Add tests with a mocked `damage_review` response that verifies the displayed source reference and all five part-family mappings.
