# Car-part CAD pipeline proof of concept

This repository contains a small, evidence-first decision engine. It answers one safety-critical question: does the job contain enough verified geometry to release a CAD candidate for human review?

It includes a mobile-first website and the native iOS proof of concept. The website is the quickest way to test the complete Astra flow.

## Source-of-truth hierarchy

Use this order for each feature:

1. OEM engineering or service data that legally covers the vehicle and part.
2. A registered 3D scan of the intact part or mating interface, with scale and uncertainty.
3. Manual measurements of fit-critical features, linked to evidence.
4. Image or model inference. This can propose geometry, but it cannot authorize hard limits.
5. Unknown. The pipeline blocks release.

Public vehicle data can identify a vehicle. NHTSA vPIC is useful for VIN decoding and manufacturer-submitted vehicle specifications. It is not a general repository of OEM part CAD or tolerance drawings. OEM service portals can contain repair manuals and wiring diagrams, but access and redistribution rights vary by manufacturer and subscription.

## Capture contract

The iPhone client must capture:

- VIN or a user-confirmed make, model, year, trim, and side of vehicle.
- A short LiDAR/ARKit scan of the part and the mating area. Save the mesh, camera poses, depth confidence, and device model.
- A scale reference in the same capture. A printed fiducial target or a user-entered caliper measurement is required.
- Photos of every mounting face, hole, pin, seal, datum, and damaged boundary.
- An evidence ID for every measurement. Store uncertainty and tolerance separately.

Apple ARKit scene reconstruction provides an approximate polygonal mesh. It supports LiDAR-equipped devices, but the mesh is not automatically an engineering drawing. The app must calibrate scale, register multiple views, report uncertainty, and ask for manual measurements when a feature is too small or occluded.

## Pipeline

`photo -> Astra identifies vehicle and part -> user confirms or accepts Astra result -> Astra searches official sources -> LiDAR scan when dimensions are missing -> Astra combines sources and scan -> CAD result`

After vehicle confirmation, the app exposes only two Astra outcomes: a short request to use LiDAR, or a shareable CAD file. LiDAR is an intermediate step. Saving a scan sends its OBJ mesh to Astra without a second action. If a scan does not show all required geometry, Astra requests a targeted rescan. The loop ends only when Astra returns a validated CAD file. Source URLs, required dimensions, tolerances, and validation records remain internal. The relay rejects `cad_ready` unless every required dimension has exact sourced evidence and Astra confirms that the generated script was checked against that evidence.

Run it:

```sh
python3 pipeline.py sample/job.json
python3 tests/test_pipeline.py
```

## Run the mobile website

The Python relay serves the website and keeps the OpenAI API key out of the browser.

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

Open `http://localhost:8787` on the computer. To run it on an iPhone, connect the computer and iPhone to the same Wi-Fi network. Find the computer's local IP address. Open `http://COMPUTER-IP:8787` in iPhone Safari. Allow port 8787 through the computer firewall if the page does not load.

Website flow:

1. Select **Take or choose a photo**. On iPhone, this opens the camera or photo library.
2. Select **Identify vehicle and part**.
3. Correct the detected make, model, or year when required. Select **Confirm and find constraints**.
4. Astra searches official sources. If the evidence is sufficient, download the `.scad` model.
5. If Astra requests measurements, import an OBJ mesh from a LiDAR scanner.
6. Select the OBJ coordinate unit. The page converts the mesh to millimetres and shows its X, Y, and Z bounds.
7. For scale calibration, enter a known physical reference length and the same reference length in the mesh. The website applies the correction ratio before submission.
8. Select **Use measured mesh for CAD**. Astra returns CAD or asks for a focused rescan.

Use `sample/demo-bracket.obj` to test the upload and scale display without a scanner. Select **metres** as its coordinate unit. Its expected bounds are 120 × 50 × 10 mm. These are axis-aligned bounds. They are hard part dimensions only when the scan axes align with the part datums.

The website performs a feature check for WebXR depth access. Current iPhone Safari versions do not expose the raw ARKit LiDAR mesh to a normal webpage and do not reliably expose the exact iPhone model. The page reports this limit instead of claiming a false LiDAR result. Use the native iOS app in this repository, or another scanner that can export OBJ, for the LiDAR capture. The website then handles scale normalization, dimension display, Astra submission, and CAD download.

## Build plan

Phase 1: collect ten part families with intact and broken samples. Measure hole centers, pin locations, mating faces, and fit outcomes with a caliper or metrology scanner. Use this set to define acceptance thresholds.

Phase 2: validate the iPhone ARKit/RealityKit OBJ export against measured sample parts. Add scale calibration, camera poses, and confidence metadata. Use a second measurement method for ground truth.

Phase 3: add a retrieval service for VIN decoding, licensed OEM documents, part-number catalogs, and user-supplied donor scans. Keep provenance and usage rights with each constraint.

Phase 4: add a CAD kernel or a controlled parametric template library. The language model may select features and parameters. A deterministic geometry service must create and validate the solid.

Phase 5: validate fit on physical test parts. Do not market safety-critical parts, steering, brake, restraint, suspension, or crash structures until an engineer and the applicable regulatory process approve them.

## MacBook and iPhone setup

The repository includes `CarPartCAD.xcodeproj`. A macOS machine with Xcode 15 or newer is required to build the iOS app. Windows can edit the source and run the Python tests. Windows cannot compile or sign the iOS target.

Prepare the MacBook:

1. Install Xcode 15 or newer from the Mac App Store. Open Xcode once so it can install its components.
2. Install Git and Python 3. Clone this repository:

   ```sh
   git clone https://github.com/BrennanOwYong/car_parts.git
   cd car_parts
   ```

3. Run the local checks:

   ```sh
   python3 tests/test_pipeline.py
   python3 tests/test_astra_flow.py
   python3 tests/test_docs.py
   python3 astra_relay.py --self-test
   ```

Pair the iPhone:

1. Use an iPhone Pro model that has LiDAR. Install an iOS version that Xcode supports.
2. Connect the iPhone to the MacBook with a USB cable. Unlock it. Select **Trust** when the iPhone asks.
3. On the iPhone, open **Settings > Privacy & Security > Developer Mode**. Enable Developer Mode. Restart the iPhone if required.
4. In Xcode, open **Window > Devices and Simulators**. Select the iPhone. Wait until Xcode completes device preparation.
5. To test without a cable later, enable **Connect via network** in the device window. Keep both devices on the same Wi-Fi network.

Configure and run the app:

1. Open `CarPartCAD.xcodeproj` in Xcode.
2. In **Signing & Capabilities**, select your Apple Developer team. Change the bundle identifier if Xcode reports a collision.
3. Get the MacBook Wi-Fi address with `ipconfig getifaddr en0`.
4. Set `ASTRA_RELAY_URL` in `CarPartCAD/Info.plist`. Use the MacBook Wi-Fi address. An example is `http://192.168.1.25:8787/analyze`.
5. In Terminal, set the API key and start the relay:

   ```sh
   export OPENAI_API_KEY="your-key"
   python3 astra_relay.py
   ```

6. If macOS asks, allow Python to accept incoming network connections. Do not put the API key in the iOS project.
7. In Xcode, select the paired iPhone as the run destination. Press **Run**. Grant camera, photo, local network, and world-sensing access when requested.

Test the complete flow:

1. Photograph a vehicle with the damaged or selected part visible. A close photo also works when the vehicle context is clear.
2. Check Astra's make, model, and year. Correct the fields if needed. If you do not know the vehicle, accept Astra's candidate.
3. Select **Confirm or use Astra result**. Astra searches official sources.
4. If Astra has exact fit-critical dimensions, wait for the OpenSCAD file. Select **Share CAD file**.
5. If Astra requests LiDAR, scan the part and its mounting interface. Include screw holes, pins, clips, mating faces, and a scale reference. Select **Use scan for CAD**.
6. The app sends the OBJ automatically. There is no separate send action. If Astra asks for another scan, capture the named missing region. Repeat until the CAD file is ready.
7. Share the `.scad` file to the MacBook. Open it with OpenSCAD. Compare its dimensions with caliper measurements before fabrication.

Troubleshoot the device link:

- Confirm that the relay prints `Astra relay listening on 0.0.0.0:8787`.
- Confirm that the MacBook and iPhone use the same Wi-Fi network. Disable VPN isolation for this test.
- Confirm that `ASTRA_RELAY_URL` uses the MacBook address, not `localhost`.
- Allow inbound TCP port 8787 in the macOS firewall.
- Keep the USB cable connected if wireless Xcode deployment is unstable.
- LiDAR scene reconstruction does not run in the iOS Simulator. Use the physical iPhone.

## Windows and MacBook collaboration

- Use Windows for Swift source edits, Python tests, source-index maintenance, relay work, and normal Git commits.
- Use the MacBook for Xcode project settings, Apple signing, device deployment, LiDAR tests, and App Store tooling.
- Use this GitHub repository as the handoff point. Start work with `git pull --ff-only`. Commit one logical change. Push it before you switch computers.
- Use one branch for each change. Do not edit the same Swift file on both computers before one copy is pushed.
- Run all Python checks on either computer. Run the Xcode build and physical-device checks on the MacBook before you merge a branch.
- Keep signing certificates, provisioning profiles, API keys, and captured vehicle images out of the shared repository.
- The JSON relay is the cross-platform boundary. The iPhone remains the capture client. Either laptop can run the relay.

## Start the Astra relay

Do not put an OpenAI API key in the iPhone app. Run the included relay on the Mac or Windows laptop:

```sh
export OPENAI_API_KEY="your-key"
python3 astra_relay.py
```

On Windows PowerShell, use `$env:OPENAI_API_KEY="your-key"` before the Python command. Find the laptop's local IP address. Replace `YOUR-LAPTOP-IP` in `CarPartCAD/Info.plist`, for example `http://192.168.1.25:8787/analyze`. Keep the iPhone and laptop on the same Wi-Fi network. Allow inbound TCP port 8787 in the laptop firewall for local testing.

The relay sends the photo to `gpt-6-astra`. It enables web search after vehicle confirmation. It uses a strict JSON schema for the vehicle, part, source links, missing dimensions, and CAD output. When official dimensional evidence is insufficient, it returns the missing dimensions and removes any unsupported CAD payload. After a LiDAR scan, the app exports an OBJ mesh and sends it to the same relay automatically. An incomplete scan produces another focused LiDAR request. It never produces unsupported CAD.

The vehicle confirmation form is editable. If the user does not know the exact vehicle, they can accept Astra's values. When Astra returns valid OpenSCAD, the app writes a `.scad` file and exposes the native iOS share sheet.

This is still a development build. The scan uses ARKit scene geometry in metres. Add a calibration target and physical accuracy validation before using the output for a real fit.

## Key product decision

LiDAR is a measurement input, not the source of truth. For a part with hidden screw bosses, sealing surfaces, clips, or safety function, the mating vehicle interface and an authoritative source are required. If neither exists, the correct product behavior is “blocked; request more evidence,” not an invented dimension.
