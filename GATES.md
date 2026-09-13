# Gates: car part reconstruction pipeline

OWNS: README.md, pipeline.py, tests/**, sample/**, CarPartCAD/**, CarPartCAD.xcodeproj/**

Scope: deliver a runnable proof of concept that fuses vehicle evidence, scan measurements, and source confidence before CAD release

- [x] G1: the pipeline emits a blocked result when a fit-critical feature has no measured evidence
  CHECK: python3 tests/test_pipeline.py
  EXPECT: all pipeline checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=506bbde945c8fa1689b345570cb2253bfd114336d85fde0c70378128dab5f9da; output-bytes=129

- [x] G2: the pipeline emits a printable candidate only when required hard constraints are measured or verified by an authoritative source
  CHECK: python3 tests/test_pipeline.py
  EXPECT: all pipeline checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=579296893d663d43a8d77464a43ee1d9a94d9cfcbb5705605adfbfd1318caeba; output-bytes=129

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
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=c06a99815338a628bf60a98dc3338558f4efb80302f7827122ac6aa864a34aed; output-bytes=138

- [x] G6: the relay keeps the OpenAI key off the iPhone and sends image input with web search to gpt-6-astra
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=d03c28edfaaf0e7e211af253f6f6838289222e8e5407dff64d670272567aa317; output-bytes=138

- [x] G7: the app offers LiDAR only when Astra reports insufficient dimensional evidence
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=ef1f700d45d4061a92d21dd0840af9d4411c853efc52b05372eb85f6fea4c054; output-bytes=138

- [x] G8: Astra responses use a strict JSON schema and reject invalid CAD evidence states
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=bf7f928428958f80d97f7b0e133a65747f1bee34e9b1d771dd35c14e1e7bae7e; output-bytes=138

- [x] G9: the user can correct the Astra vehicle candidate before research starts
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=308c28f0250448b7d94937ef7d141b6792262c9367116bc105c27d9e7d72d7be; output-bytes=138

- [x] G10: a valid Astra CAD result is saved as a shareable OpenSCAD file
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=d187116dddce777dcb6d17f8b6cd3be84e4df1d2496f91489957c7aea454fbac; output-bytes=138

- [x] G11: after vehicle confirmation the user sees only a LiDAR request or a CAD file result
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=efe5eecd6e8b5d82f6335ef234344b699da44f543d54de66b344dac630eeed7e; output-bytes=138

- [x] G12: the relay rejects CAD unless every required dimension has exact sourced evidence and validation is confirmed
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=d39f729ff61794e35488dfee261bf12016cca042041bff42938fc1b245a4842c; output-bytes=138

- [x] G13: source and validation records remain internal and are not rendered in the mobile result screen
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=2ff4c7e8e096749a9db614bacd0d1c60de20a2bf5791270fa7b709379f253681; output-bytes=138

- [x] G14: saving a LiDAR capture submits the OBJ to Astra without a second user action
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=fa0064b44891bb974d778816f90c76768f723aa2e74e720273562c2df410f4e1; output-bytes=138

- [x] G15: an incomplete LiDAR capture starts a targeted rescan loop and never releases unsupported CAD
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=8ba1c678a09a3e29c75aee9af2cc2b60a3dbf453666b37e41e4dcbbbc11c6bfe; output-bytes=138

- [x] G16: the repository gives complete MacBook pairing, iPhone deployment, LiDAR test, and Windows collaboration instructions
  CHECK: python3 tests/test_docs.py
  EXPECT: device documentation checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=bd1b51fd80c6bf5b8610403688518e9e4cd4edf9a2efca86408e8813a75722cf; output-bytes=136

- [x] G17: the mobile website implements photo capture, vehicle confirmation, Astra research, LiDAR fallback, and CAD download
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=90531424d6e795fcf9ec5a89099768f697f4429d33a04df8b78216a0a9e191d7; output-bytes=282

- [x] G18: the website reports browser LiDAR capability without claiming access that Safari does not provide
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=49ba4f5d28a46003ebae4f61163c9928ca2b34cd544a15a70fcf5541c27c7f7c; output-bytes=282

- [x] G19: the website parses an OBJ mesh, normalizes its scale to millimetres, reports its extents, and submits it to Astra
  CHECK: node tests/test_mesh.mjs
  EXPECT: mesh calculation checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=2670f6e9f929e311daf6c220659954cb76fc2e2bcb43ddd53d1f8594565f0f55; output-bytes=31

- [x] G20: the Python relay serves the website and keeps the API endpoint on the same origin
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=85b52166d0d4fc93a7e4b2f0ec7cbe293043acbff8b4197d75bbdb804af09563; output-bytes=282
