# Gates: car part reconstruction pipeline

OWNS: README.md, pipeline.py, tests/**, sample/**, CarPartCAD/**, CarPartCAD.xcodeproj/**

Scope: deliver a runnable proof of concept that fuses vehicle evidence, scan measurements, and source confidence before CAD release

- [x] G1: the pipeline emits a blocked result when a fit-critical feature has no measured evidence
  CHECK: python3 tests/test_pipeline.py
  EXPECT: all pipeline checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=7f85ea6e9609fdfdd2b9c17cf9f0b362ef1bb6b4c60326c71604bb7f749ae5fc; output-bytes=129

- [x] G2: the pipeline emits a printable candidate only when required hard constraints are measured or verified by an authoritative source
  CHECK: python3 tests/test_pipeline.py
  EXPECT: all pipeline checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=fb57c19e26f05b7d8dbf1006e8e7ac866c851a15d399f531fe6605137cb489c0; output-bytes=129

- [x] G3: the repository documents the source-of-truth hierarchy and iPhone capture contract
  CHECK: python3 -c "from pathlib import Path; p=Path('README.md').read_text(); assert 'source-of-truth hierarchy' in p.lower() and 'capture contract' in p.lower(); print('documentation checks passed')"
  EXPECT: documentation checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=cdf5ef3fe24ecc18352a9514cd99c91cbbabde884375bf4232def3837c4f767c; output-bytes=28

- [x] G4: the Xcode target references all Swift source files and declares camera and world-sensing permissions
  CHECK: python3 -c "from pathlib import Path; p=Path('CarPartCAD.xcodeproj/project.pbxproj').read_text(); assert all(x in p for x in ['CarPartCADApp.swift','Models.swift','ReconstructionModel.swift','ContentView.swift','CaptureViews.swift']); q=Path('CarPartCAD/Info.plist').read_text(); assert 'NSCameraUsageDescription' in q and 'NSWorldSensingUsageDescription' in q; print('iOS project checks passed')"
  EXPECT: iOS project checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=187e99141471580e2faf6205884210d6019244f696051e696ad4b49480efcf99; output-bytes=26

- [x] G5: the mobile flow sends a photo to Astra before it offers LiDAR capture
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=a629216cb37e5cf03a5ee5e3dae8f4722f03868dd08b07cb5f454eb446084e8e; output-bytes=139

- [x] G6: the relay keeps the OpenAI key off the iPhone and sends image input with web search to gpt-6-astra
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=3104c4ec55d711397a86001390865c6ef46067f6162d365e332e7f9f7406931d; output-bytes=139

- [x] G7: the app offers LiDAR only when Astra reports insufficient dimensional evidence
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=7929fc3d3ec948657e6faa47b43bfc84893738f9e41cf509189bedfcd17f9807; output-bytes=139

- [x] G8: Astra responses use a strict JSON schema and reject invalid CAD evidence states
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=15ea516b6caa7affd9901a205b90385e492ea4c83fe08b2c2be1927faed554a6; output-bytes=139

- [x] G9: the user can correct the Astra vehicle candidate before research starts
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=364d20f9819eac3f5cbd100b2772b5bf6967254854fa73ddb02e9cc849b1f963; output-bytes=139

- [x] G10: a valid Astra CAD result is saved as a shareable OpenSCAD file
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=26738fbc660c5fdb1908a7dad04114b50470dc38be2e8821a02541477523f114; output-bytes=139

- [x] G11: after vehicle confirmation the user sees only a LiDAR request or a CAD file result
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=f094f58dbf5ce36497c2e4d7f37c934fa19062e13989674940ea61b69ffd5ea7; output-bytes=139

- [x] G12: the relay rejects CAD unless every required dimension has exact sourced evidence and validation is confirmed
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=cb36ee6f2fa701f51811336a2b0796e171aa0611968062ec80a326621c67deb8; output-bytes=139

- [x] G13: source and validation records remain internal and are not rendered in the mobile result screen
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=20ef97e7b0bb6afc412e6a6ee7e611055b34f8ed9cfaa883aeb09f6b65064c96; output-bytes=139

- [x] G14: saving a LiDAR capture submits the OBJ to Astra without a second user action
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=d246bd730478c3213ed68113678e530db92e46e12d2be9eef11c4409919c89f5; output-bytes=139

- [x] G15: an incomplete LiDAR capture starts a targeted rescan loop and never releases unsupported CAD
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=3104c4ec55d711397a86001390865c6ef46067f6162d365e332e7f9f7406931d; output-bytes=139

- [x] G16: the repository gives complete MacBook pairing, iPhone deployment, LiDAR test, and Windows collaboration instructions
  CHECK: python3 tests/test_docs.py
  EXPECT: device documentation checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=16f3ae2391bc6a12a42eddcf35fc20812dda1c85ef75ccba7306e85c12d3f1f2; output-bytes=136

- [x] G17: the mobile website implements photo capture, optional text, vehicle confirmation, dimensional-document research, a LiDAR instruction fallback, and CAD download
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=2f67defe228ba212bdb9021bd03f3c0e12ae6df129574f4f56d9063fd215838a; output-bytes=312

- [x] G18: the website reports browser LiDAR capability without claiming access that Safari does not provide
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=6e24eb96560fe6e2cf307ee86ba0f4da3ac49da07eaa646a7627aade2500a980; output-bytes=312

- [x] G19: the website MVP accepts one image and text fields only; it does not accept video or mesh input
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=3cda3fdcee9d1127a059f29bc3ad61e3f052c77fba85f33bd1698fdd551dc69c; output-bytes=312

- [x] G20: the Python relay serves the website and keeps the API endpoint on the same origin
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=524f2dace4541b0ea6a94e6f2ba254dc26f75ab454b7ba8ac9cb2aa83340bb68; output-bytes=312

- [x] G21: the website uses the native rear-camera photo input and does not request a continuous video stream
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=d829beec8eb0d1068fd18a47e5bdf801c6e44a6dd8c95b9f2455315fed9d293e; output-bytes=312

- [x] G22: the captured photo is converted to JPEG and enables Astra analysis
  CHECK: node tests/test_photo.mjs
  EXPECT: photo capture checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=5783a23b61e997befe17a5e56d98bb2c3243cd26b60e09bf9309f15fb77797a7; output-bytes=28

- [x] G23: the vehicle-schematic-sourcing skill is valid and routes agents to the maintained official-source catalog
  CHECK: python3 /home/unix/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/vehicle-schematic-sourcing
  EXPECT: Skill is valid!
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=db349825903d66adffea3ecf1bd8e1803043e8a71cf1a051235dabc5371f5bb0; output-bytes=16

- [x] G24: the source catalog contains only direct free official documents with explicit dimensions
  CHECK: python3 tests/test_source_catalog.py
  EXPECT: source catalog checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=05ccd9490815dca0706ac0b9d4687766d9f3e33c27f41ac7aa11d95385079989; output-bytes=132

- [x] G25: Astra receives exact make-model-year dimensional documents before open web search and cannot use an unmeasured diagram as dimensional proof
  CHECK: python3 tests/test_source_catalog.py
  EXPECT: source catalog checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=3a165c7efc26da0cfe9b8ef177805d9ad43d540f727f4e0bbb70a8f89cc82855; output-bytes=132

- [x] G26: the website tells the user that dimension-bearing official documents were pre-indexed before the current job
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=cc00ecb8ba01794dea98e1c0f4662013ad1bc7f4dd44240e79f96eded5ee2913; output-bytes=312

- [x] G27: the website sends optional user text with the photo and limits the text to 2000 characters
  CHECK: python3 tests/test_astra_flow.py && python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=40bdb039e87817ba83008ccd84cb3da8783f8f2e392b4827bd44743e24fd6525; output-bytes=450
