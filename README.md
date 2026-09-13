# Car-part CAD desktop prototype

This repository contains a desktop website for an evidence-first car-part CAD flow. Upload one photo of a car or visible car part. Astra identifies the vehicle and part. You confirm the make, model, and year. Astra then checks pre-indexed official dimensional documents and performs a targeted web search. The website releases fitted and exploded-view OpenSCAD files only when exact official evidence covers every required hard dimension.

## Source-of-truth hierarchy

Use this order for each geometric feature:

1. An OEM engineering or service document that applies to the exact vehicle and part.
2. Image or model inference. This can identify a likely shape. It cannot authorize a hard dimension.
3. Unknown. The pipeline blocks CAD release.

A hard dimension controls fit or safe installation. Examples include mounting-hole centers, locating pins, sealing faces, interface planes, and clearance boundaries. An exploded diagram without stated dimensions is not dimensional evidence.

## Website flow

`upload photo -> Astra identifies vehicle and part -> user confirms vehicle -> Astra checks official dimensional documents -> fitted CAD and exploded-view downloads or missing-dimensions report`

The website accepts one image file and optional text. It does not request a camera. It does not accept video or 3D scan input. If exact official dimensions are unavailable, Astra lists the missing measurements and does not generate unsupported CAD.

## Run on a desktop computer

The Python relay serves the website at `http://localhost:8787`. It also keeps the OpenAI API key out of browser code.

On macOS or Linux:

```sh
git clone https://github.com/BrennanOwYong/car_parts.git
cd car_parts
export OPENAI_API_KEY="your-key"
python3 astra_relay.py
```

On Windows PowerShell:

```powershell
git clone https://github.com/BrennanOwYong/car_parts.git
cd car_parts
$env:OPENAI_API_KEY="your-key"
python astra_relay.py
```

Open `http://localhost:8787` in a desktop browser. Select **Upload car photo**. Choose an existing JPEG, PNG, HEIC, or other browser-supported image. Add an optional description. Then select **Identify vehicle and part**.

Keep the terminal open while you use the website. Press `Ctrl+C` to stop the server. Do not put the API key in `web/app.js` or another browser file.

## Pre-indexed official sources

The repository includes the `skills/vehicle-schematic-sourcing` skill. Its catalog contains direct, free, official documents with explicit measurements. It excludes parts catalogs, VIN tools, general landing pages, and diagrams that do not state dimensions. The Astra relay loads this catalog before each confirmed-vehicle request.

The runtime catalog is `skills/vehicle-schematic-sourcing/references/official_sources.json`. It contains verified dimensional documents for selected Tesla, Chevrolet City Express, and Ram 1500 SSV configurations. The relay uses an indexed document only when the make, model, and year match.

For an example, open the [GM 2015-2018 Chevrolet City Express Body Builder Manual](https://www.gmupfitter.com/wp-content/uploads/2021/05/2015-18-CHEVROLET-CITY-EXPRESS-CARGO-VAN_BBM_V1.pdf). Page 59 contains a seat mounting-hole drawing with dimensions A=380 mm, B=375 mm, C=560 mm, and D=550 mm.

The catalog is a starting index. It is not a complete source for every vehicle and part. If the catalog has no exact match, Astra performs a targeted search for another official dimensional document. If the search fails, the website lists the missing dimensions. It does not treat a photograph or an unmeasured diagram as dimensional proof.

To install the source skill in Codex on another computer:

```sh
cp -R skills/vehicle-schematic-sourcing ~/.codex/skills/
```

## Local checks

Run all checks from the repository root:

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
node tests/test_photo.mjs
python3 astra_relay.py --self-test
python3 /home/unix/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/vehicle-schematic-sourcing
```

Windows can run the Python and Node.js checks with `python` and `node`. The Codex skill validator path is specific to a Codex Linux or WSL installation.

## Development roadmap

1. Collect representative photos and exact vehicle labels for ten part families.
2. Expand the official dimensional-source catalog and record document applicability.
3. Add controlled CAD templates for common non-safety-critical part families.
4. Add deterministic geometry and interference checks for generated OpenSCAD.
5. Compare generated models with caliper or metrology measurements before fabrication.

Do not use prototype output for brake, steering, restraint, suspension, or crash structures. A qualified person must inspect all dimensions and tolerances before fabrication.
