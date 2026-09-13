# Gates: car part reconstruction pipeline

OWNS: README.md, pipeline.py, tests/**, sample/**, CarPartCAD/**, CarPartCAD.xcodeproj/**

Scope: deliver a runnable proof of concept that fuses vehicle evidence, scan measurements, and source confidence before CAD release

- [x] G1: the pipeline emits a blocked result when a fit-critical feature has no measured evidence
  CHECK: python3 tests/test_pipeline.py
  EXPECT: all pipeline checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=e7ec7e9cd73ef4f4de06d007a254c6ba8adec865a309b981459581e434a29d56; output-bytes=129

- [x] G2: the pipeline emits a printable candidate only when required hard constraints are measured or verified by an authoritative source
  CHECK: python3 tests/test_pipeline.py
  EXPECT: all pipeline checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=124c004139c235cba08573b230239c7335318a5dd113864ce45ed43245c1e4bf; output-bytes=129

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
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=f17e554f66b3beb90928a0987a914845041c023f8c22ecb6cfdb4967a013dc01; output-bytes=138

- [x] G6: the relay keeps the OpenAI key off the iPhone and sends image input with web search to gpt-6-astra
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=b2a1bdc1aefba2c54da2f66113f79fe1f4a7b9f13aa31d92a94c7d80aa25a0dc; output-bytes=138

- [x] G7: the app offers LiDAR only when Astra reports insufficient dimensional evidence
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=f4081917dd31ac9c02032eac4b0669683c36007a89184e2391d78b9a344f9108; output-bytes=138

- [x] G8: Astra responses use a strict JSON schema and reject invalid CAD evidence states
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=6f5ea7593949891046cc1fd6c1920618bf854aa3ecfb9e6dd2c9cfafad025ec7; output-bytes=138

- [x] G9: the user can correct the Astra vehicle candidate before research starts
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=efc83ebb035eb7256780b393dbcd74898e80eb275fa64d49e7b95fc6b514e4d9; output-bytes=138

- [x] G10: a valid Astra CAD result is saved as a shareable OpenSCAD file
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=efc83ebb035eb7256780b393dbcd74898e80eb275fa64d49e7b95fc6b514e4d9; output-bytes=138

- [x] G11: after vehicle confirmation the user sees only a LiDAR request or a CAD file result
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=2c90f7a4d1fa04db703181c1d9fba8426c9f5bb1e36632ee3cac4e85e906a0a7; output-bytes=138

- [x] G12: the relay rejects CAD unless every required dimension has exact sourced evidence and validation is confirmed
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=f17e554f66b3beb90928a0987a914845041c023f8c22ecb6cfdb4967a013dc01; output-bytes=138

- [x] G13: source and validation records remain internal and are not rendered in the mobile result screen
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=4a007227435d34db7409574e880dccaa4904d1040ef047cc24b3093835d2cff6; output-bytes=138

- [x] G14: saving a LiDAR capture submits the OBJ to Astra without a second user action
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=523b295b483dc908446d2b6ac9e82dd3ae961e2439fac2919d6ee983a8fefaae; output-bytes=138

- [x] G15: an incomplete LiDAR capture starts a targeted rescan loop and never releases unsupported CAD
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=efc83ebb035eb7256780b393dbcd74898e80eb275fa64d49e7b95fc6b514e4d9; output-bytes=138

- [x] G16: the repository gives complete MacBook pairing, iPhone deployment, LiDAR test, and Windows collaboration instructions
  CHECK: python3 tests/test_docs.py
  EXPECT: device documentation checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/Users/brenn/Documents/AI for car parts; path=92792f6aa0d6/86 entries; EXPECT=matched; output-sha256=99043322ac9d69c65b9563cd5f97cf82eadf407d512692753705af4b9165b930; output-bytes=136
