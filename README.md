# CarPart CAD hackathon demo

This repository contains a conversational desktop website. Upload or paste a car photo. Tell Astra which visible exterior part you want. Astra identifies the vehicle and part. You confirm or correct the result in the conversation. Astra then searches for usable geometry and returns fitted and exploded-view OpenSCAD files when the evidence is sufficient.

## Hackathon scope

The demo supports five exterior parts:

- hood;
- front bumper cover;
- front fender;
- wheel-arch trim or fender flare;
- side-mirror housing.

The app creates a rough visual concept. It is not suitable for fabrication or vehicle installation. It does not guarantee fit. Every result distinguishes sourced dimensions from estimated dimensions and lists the assumptions used.

## Conversational flow

`upload or paste photo -> describe target part -> Astra identifies vehicle and part -> confirm or correct in plain text -> OEM documents -> public 3D scans -> LiDAR request only if needed -> rough fitted and exploded CAD`

There are no vehicle or part forms. Astra states its estimate in the conversation. Reply with a correction such as `This is a 2020 Mazda 3 and I want the front bumper cover.` Send a blank message to accept Astra's estimate.

After confirmation, Astra uses this source order:

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

The repository also includes the `skills/vehicle-schematic-sourcing` skill. The skill applies the same distinction between stated dimensions and visual estimates.

## Local checks

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
node tests/test_photo.mjs
./astra_relay.py --self-test
python3 /home/unix/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/vehicle-schematic-sourcing
```

The application is a hackathon demonstration. Do not install its generated geometry on a vehicle.
