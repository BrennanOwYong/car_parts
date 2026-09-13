# Gates: car part reconstruction pipeline

OWNS: README.md, pipeline.py, tests/**, sample/**, CarPartCAD/**, CarPartCAD.xcodeproj/**

Scope: deliver a runnable proof of concept that fuses vehicle evidence, scan measurements, and source confidence before CAD release

- [x] G1: the pipeline emits a blocked result when a fit-critical feature has no measured evidence
  CHECK: python3 tests/test_pipeline.py
  EXPECT: all pipeline checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=4194fb7b4df00d365021da82d83c650e24d705af5dad5fdda152f5baab000319; output-bytes=129

- [x] G2: the pipeline emits a printable candidate only when required hard constraints are measured or verified by an authoritative source
  CHECK: python3 tests/test_pipeline.py
  EXPECT: all pipeline checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=01dd2ae0e67264f8bbbc4e050ed1e0b2a8a2ea22c544935668578c79e799d857; output-bytes=129

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
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=f2ebbcb396a6aa162227d614ecb282b8d4fc8e953c5f22094e24d55dd125c4be; output-bytes=138

- [x] G6: the relay keeps the OpenAI key off the iPhone and sends image input with web search to gpt-6-astra
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=d03c28edfaaf0e7e211af253f6f6838289222e8e5407dff64d670272567aa317; output-bytes=138

- [x] G7: the app offers LiDAR only when Astra reports insufficient dimensional evidence
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=f17e554f66b3beb90928a0987a914845041c023f8c22ecb6cfdb4967a013dc01; output-bytes=138

- [x] G8: Astra responses use a strict JSON schema and reject invalid CAD evidence states
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=efe5eecd6e8b5d82f6335ef234344b699da44f543d54de66b344dac630eeed7e; output-bytes=138

- [x] G9: the user can correct the Astra vehicle candidate before research starts
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=958857839e6b26e537121efa7b377ca1556b438225df90cd4280d71522796a82; output-bytes=138

- [x] G10: a valid Astra CAD result is saved as a shareable OpenSCAD file
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=f2ebbcb396a6aa162227d614ecb282b8d4fc8e953c5f22094e24d55dd125c4be; output-bytes=138

- [x] G11: after vehicle confirmation the user sees only a LiDAR request or a CAD file result
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=58d9519015e87c3b76c8e7ce9d61756f86cd9023cab70f9c88f66741dcb8ed4a; output-bytes=138

- [x] G12: the relay rejects CAD unless every required dimension has exact sourced evidence and validation is confirmed
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=fa0064b44891bb974d778816f90c76768f723aa2e74e720273562c2df410f4e1; output-bytes=138

- [x] G13: source and validation records remain internal and are not rendered in the mobile result screen
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=b136b3b9d1d8964ae93762e395a3ed62363fa47794ec33dce4ef586b10332cee; output-bytes=138

- [x] G14: saving a LiDAR capture submits the OBJ to Astra without a second user action
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=86d2a7792695a51508caf619cc8a52ecff1f6b509caa44307eece32b717b03ee; output-bytes=138

- [x] G15: an incomplete LiDAR capture starts a targeted rescan loop and never releases unsupported CAD
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=308c28f0250448b7d94937ef7d141b6792262c9367116bc105c27d9e7d72d7be; output-bytes=138

- [x] G16: the repository gives complete MacBook pairing, iPhone deployment, LiDAR test, and Windows collaboration instructions
  CHECK: python3 tests/test_docs.py
  EXPECT: device documentation checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=99043322ac9d69c65b9563cd5f97cf82eadf407d512692753705af4b9165b930; output-bytes=136

- [x] G17: the mobile website implements photo capture, vehicle confirmation, Astra research, LiDAR fallback, and CAD download
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=8e96451b11d1b83b9e90feb9143fc2731e01f6687a1d279c39e77a08d6aa6663; output-bytes=312

- [x] G18: the website reports browser LiDAR capability without claiming access that Safari does not provide
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=fda31c5bf976595f42f988686dea1e67dcae1da221d11f8a2f8f38ee76f676a9; output-bytes=312

- [x] G19: the website parses an OBJ mesh, normalizes its scale to millimetres, reports its extents, and submits it to Astra
  CHECK: node tests/test_mesh.mjs
  EXPECT: mesh calculation checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=2670f6e9f929e311daf6c220659954cb76fc2e2bcb43ddd53d1f8594565f0f55; output-bytes=31

- [x] G20: the Python relay serves the website and keeps the API endpoint on the same origin
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=6c5a7b2acd042426fea3eea72cb7956454034ad4998785d541322f6ed1588e3c; output-bytes=312

- [x] G21: the website uses the native rear-camera photo input and does not request a continuous video stream
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=44b29e7963c2de9f006888a3f0ff46c6b94ca94e6d7e7071e006af3d0b83dbad; output-bytes=312

- [x] G22: the captured photo is converted to JPEG and enables Astra analysis
  CHECK: node tests/test_photo.mjs
  EXPECT: photo capture checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=5783a23b61e997befe17a5e56d98bb2c3243cd26b60e09bf9309f15fb77797a7; output-bytes=28
