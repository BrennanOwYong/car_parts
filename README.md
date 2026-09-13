# CarPart CAD hackathon demo

This repository contains a conversational desktop website. Upload or paste a current-car photo. Ask Astra to repair visible damage. Astra identifies the vehicle, maps visible damage to the available CAD part families, and draws an image-to-CAD map. You confirm the proposed parts in a carousel. Astra then returns fitted and exploded-view OpenSCAD files for each confirmed part.

## Hackathon scope

The repair demo supports five exterior part families:

- hood;
- front bumper cover;
- front fender;
- wheel-arch trim or fender flare;
- side-mirror housing.

The app creates a rough visual concept. It is not suitable for fabrication or vehicle installation. It does not guarantee fit. Every result distinguishes sourced dimensions from estimated dimensions. It cannot diagnose hidden, structural, safety-system, glass, lighting, door, roof, rear-body, wheel, tire, or underbody damage.

## Conversational flow

`upload or paste damage photo -> describe repair need -> Astra identifies vehicle -> confirm or correct -> detects visible damage -> maps each item to an available CAD part -> user confirms parts in carousel -> rough fitted and exploded CAD for each confirmed part`

There are no vehicle or part forms. Astra states its estimate in the conversation. Reply with a correction such as `This is a 2020 Mazda 3 and I want the front bumper cover.` Send a blank message to accept Astra's estimate.

For a normal single-part concept, Astra uses this source order:

1. It checks the pre-indexed official dimension documents. It then searches official OEM body-repair pages, service diagrams, parts diagrams, and stated dimensions for the exact vehicle and part.
2. If the OEM material cannot supply enough geometry, it searches the web for a public 3D scan of the exact vehicle and part.
3. If OEM material and a usable public scan are both insufficient, it asks the user to make a LiDAR scan. It does not return CAD in this response.

The photo can support the silhouette and proportional estimates. An official diagram can support part identity, boundaries, adjacency, and mounting context. It does not prove a dimension unless the source states that value.

A public scan is an independent reference. It is not an OEM or certified source. For each public scan, the result must keep the title, URL, creator and platform when available, `sourceType=public_scan`, and the stated license or rights status. Public access does not grant permission to copy, change, or redistribute a scan. Review its license before use. If the rights are unknown or restricted, treat the scan as a visual reference only.

## Run on a desktop computer

The Python relay serves the website at `http://localhost:8787`. It binds only to `localhost`. Other computers and phones cannot connect to it. The relay keeps the OpenAI API key out of browser code.

On macOS, Linux, or WSL:

```sh
git clone https://github.com/BrennanOwYong/car_parts.git
cd car_parts
cp .env.example .env
./astra_relay.py
```

Open `.env` in a text editor. Put the key after `OPENAI_API_KEY=` before starting the relay. You can also run `python3 astra_relay.py` if the executable command is not available.

On Windows PowerShell:

```powershell
git clone https://github.com/BrennanOwYong/car_parts.git
cd car_parts
Copy-Item .env.example .env
py astra_relay.py
```

Open `http://localhost:8787` in a desktop browser. Choose an image or copy an image, focus the website, and press `Ctrl+V`. This only shows a local preview. Type what you want Astra to identify or model, then select **Send to Astra**. The image and text are sent together only at that point.

Keep the terminal open. Press `Ctrl+C` to stop the server. The `.env` file is ignored by Git. Do not put the API key in `.env.example` or browser code.

If the relay cannot find the key, run it with an explicit `.env` path:

```sh
ASTRA_ENV_FILE="$(pwd)/.env" ./astra_relay.py
```

In Windows PowerShell:

```powershell
$env:ASTRA_ENV_FILE = "$PWD\.env"
py astra_relay.py
```

## Repair result

The repair review shows a red pin on each visible damage area, an arrow to its proposed CAD part name, and a horizontal confirmation carousel. Clear any part that is not damaged. Select **Generate CAD for confirmed parts** to create separate fitted and exploded OpenSCAD downloads.

Damage mapping is visual only. The model only maps parts visible in the uploaded photo. It does not infer damage behind the bumper cover or inside the body structure.

## Generated result

When the geometry is sufficient, the result screen shows:

- Astra's final vehicle and part identification;
- dimensions and their source method;
- broad estimated tolerances;
- modeling assumptions;
- reference links found during research;
- one fitted OpenSCAD model;
- one exploded-view OpenSCAD model.

Both scripts start with `ROUGH VISUAL CONCEPT - NOT FOR FABRICATION`.

If the source checks fail, Astra returns a LiDAR request instead of a CAD file. This desktop MVP accepts only images and text. It does not ingest a LiDAR mesh. The request explains which part and mounting areas need a later scan.

## Pre-indexed official sources

The runtime catalog is `skills/vehicle-schematic-sourcing/references/official_sources.json`. It currently contains nine free official dimensional documents for selected Tesla, Chevrolet City Express, and Ram 1500 SSV configurations.

The catalog is a starting point. For a Mazda or another vehicle without an indexed entry, Astra first uses live web search for official OEM material. If the OEM material is insufficient, it searches for a public scan of the exact vehicle and part. It requests a LiDAR scan only after those searches fail. Dimensions inferred from a diagram, scan image, vehicle proportion, or uploaded photo remain estimates.

### Vehicles to collect damage images for

Start with the exact vehicles that have pre-indexed official dimensional references and use one photo set per supported part family. Collect front-left and front-right views, plus close-ups of the damaged area. The current target set is:

- Tesla Model 3: 2017-2023 and 2024;
- Tesla Model X: 2021 and later;
- Tesla Model Y: 2020-2024;
- Tesla Model S: 2012-2020 and 2021 and later;
- Tesla Model Y L: 2025 and later;
- Chevrolet City Express: 2015-2018;
- Ram 1500 SSV: 2017.

The official references give vehicle-level dimensions. They do not supply a complete exploded CAD library. For full exterior coverage, add verified exploded views or 3D references for doors, rear bumper cover, rear quarter panels, trunk or tailgate, roof, grille, lamps, glass, rocker panels, wheels, and underbody panels.

The repository also includes the `skills/vehicle-schematic-sourcing` skill. The skill applies the same distinction between stated dimensions and visual estimates.

## Local checks

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
node tests/test_photo.mjs
./astra_relay.py --self-test
python3 /home/unix/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/vehicle-schematic-sourcing
```

The application is a hackathon demonstration. Do not install its generated geometry on a vehicle.
