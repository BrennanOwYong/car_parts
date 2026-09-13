# Gates: desktop car-part CAD website

Scope: deliver a desktop website that accepts one uploaded car photo, identifies the vehicle and part, checks exact official dimensions, and releases CAD only when the evidence is complete.

- [x] G1: the desktop website accepts one uploaded image and optional text
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed

- [x] G2: the website has no camera capture request, video input, mobile sharing, or LiDAR interface
  CHECK: python3 tests/test_web.py && python3 tests/test_docs.py
  EXPECT: desktop documentation checks passed

- [x] G3: Astra receives the uploaded image and optional text for vehicle and part identification
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed

- [x] G4: the user can correct the detected make, model, and year before research
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed

- [x] G5: confirmed jobs use pre-indexed dimensional documents before open web search
  CHECK: python3 tests/test_source_catalog.py
  EXPECT: source catalog checks passed

- [x] G6: the catalog contains only direct, free, official documents with explicit dimensions
  CHECK: python3 tests/test_source_catalog.py
  EXPECT: source catalog checks passed

- [x] G7: insufficient dimensional evidence returns a list of missing measurements and no CAD
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed

- [x] G8: CAD is released only when each hard dimension has exact official evidence
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed

- [x] G9: valid fitted CAD and exploded-view CAD download as separate OpenSCAD files
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed

- [x] G10: the relay serves the website and API from localhost while keeping the API key out of browser code
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed

- [x] G11: uploaded images are resized and converted to JPEG before analysis
  CHECK: node tests/test_photo.mjs
  EXPECT: photo upload checks passed

- [x] G12: the relay request uses a strict response schema and does not store API inputs
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed

- [x] G13: the standalone evidence decision engine blocks unsupported hard constraints
  CHECK: python3 tests/test_pipeline.py
  EXPECT: all pipeline checks passed

- [x] G14: the source-search skill remains valid
  CHECK: python3 /home/unix/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/vehicle-schematic-sourcing
  EXPECT: Skill is valid!

- [x] G15: the README gives complete macOS, Linux, and Windows desktop run instructions
  CHECK: python3 tests/test_docs.py
  EXPECT: desktop documentation checks passed
