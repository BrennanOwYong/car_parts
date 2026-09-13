# Gates: exterior-part hackathon CAD demo

Scope: identify a vehicle and one supported exterior part from an uploaded image, follow the OEM-to-public-scan-to-LiDAR fallback order, and return rough fitted and exploded OpenSCAD models when enough geometry is available.

- [x] G0: this ledger states runnable outcome checks
  CHECK: node /home/unix/.agents/skills/unlazy/scripts/gate-lint.mjs GATES.md
  EXPECT: LINT OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/users/brenn/documents/ai for car parts; path=ffe930c615e4/86 entries; EXPECT=matched; output-sha256=48630b7361dd44ee870917b12c3d19b9d7bdea738aaca16bb04d4cab83b772d2; output-bytes=8

- [x] G1: Astra and the website support hood, front bumper cover, front fender, wheel-arch trim, and side-mirror housing
  CHECK: python3 tests/test_astra_flow.py && python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/users/brenn/documents/ai for car parts; path=ffe930c615e4/86 entries; EXPECT=matched; output-sha256=bd2a7c0aeafe5c89f9e7eeac5df41ab5db8e5a1a7f18fe472a7900f78b6568f9; output-bytes=627

- [x] G2: Astra identifies the vehicle and part from the image, and the user can confirm or correct both through a plain-text conversation with no vehicle form
  CHECK: python3 tests/test_astra_flow.py && python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/users/brenn/documents/ai for car parts; path=ffe930c615e4/86 entries; EXPECT=matched; output-sha256=05df95e8963069bc755008bcc437f9dad41c72b661e66dfb97a6ce16ffa629c2; output-bytes=627

- [x] G3: confirmed jobs receive pre-indexed references and search OEM material before public 3D scans
  CHECK: python3 tests/test_source_catalog.py && python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/users/brenn/documents/ai for car parts; path=ffe930c615e4/86 entries; EXPECT=matched; output-sha256=7705f5d44d188f18bd4bf6a30100985d91f58cb381d894f0af4de62bb5c77c96; output-bytes=276

- [x] G4: Astra returns rough CAD when OEM material or a public scan provides enough geometry
  CHECK: python3 tests/test_astra_flow.py
  EXPECT: Astra flow checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/users/brenn/documents/ai for car parts; path=ffe930c615e4/86 entries; EXPECT=matched; output-sha256=7acd06fc77cfb39b315ac950bad8544b689214406f8ec88f441a87ee35b42908; output-bytes=144

- [x] G4A: Astra requests a LiDAR scan only when OEM material and public scans cannot provide enough geometry
  CHECK: python3 tests/test_astra_flow.py && python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/users/brenn/documents/ai for car parts; path=ffe930c615e4/86 entries; EXPECT=matched; output-sha256=14a7b432631fc05a279967743ec0378e950e216bd7608ee0af87d597ae248e07; output-bytes=627

- [x] G5: each result distinguishes official dimensions, public-scan estimates, and other estimates, and lists its assumptions
  CHECK: python3 tests/test_astra_flow.py && python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/users/brenn/documents/ai for car parts; path=ffe930c615e4/86 entries; EXPECT=matched; output-sha256=1dc5156d4d69dc90c72a7fd9cca7974e18b972ab6e058d438b01addc84b1419c; output-bytes=627

- [x] G6: the website downloads separate fitted and exploded OpenSCAD models
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/users/brenn/documents/ai for car parts; path=ffe930c615e4/86 entries; EXPECT=matched; output-sha256=0f694e2baefb0c796569d6a95b6dd8f3e7c8f00e782c862d9504b473800d5d09; output-bytes=484

- [x] G6A: the website uses a chat transcript and one text composer instead of make, model, year, or part form fields
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/users/brenn/documents/ai for car parts; path=ffe930c615e4/86 entries; EXPECT=matched; output-sha256=eca3e4987f2d7c9a1e5e64b69c367ff390b560a2a3638d6571cb0b0a6606294d; output-bytes=484

- [x] G6B: the desktop layout follows the supplied sketch with a title, large image pane, right-side conversation, and bottom composer
  CHECK: python3 tests/test_web.py
  EXPECT: web application checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/users/brenn/documents/ai for car parts; path=ffe930c615e4/86 entries; EXPECT=matched; output-sha256=8be2532ba83c8a7cdc2b519608c2cb5cc88c5fe745a89b561f0019f1785197cc; output-bytes=484

- [x] G7: the website labels output as a visual concept that is not suitable for fabrication or vehicle installation
  CHECK: python3 tests/test_web.py && python3 tests/test_docs.py
  EXPECT: desktop documentation checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/users/brenn/documents/ai for car parts; path=ffe930c615e4/86 entries; EXPECT=matched; output-sha256=627681e881f74bee8f24c7ec008b9475f3bd9f2a323088d8552ca3be25c8a6b9; output-bytes=626

- [x] G8: selected and Ctrl+V-pasted images use the same JPEG processing path
  CHECK: node tests/test_photo.mjs
  EXPECT: photo upload checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/users/brenn/documents/ai for car parts; path=ffe930c615e4/86 entries; EXPECT=matched; output-sha256=f52ebe80b82dccc653ac543c2ed0d170d79eec5803a1a91234357130b7089194; output-bytes=27

- [x] G9: the relay remains localhost-only and loads the private API key outside browser code
  CHECK: python3 tests/test_web.py && python3 tests/test_docs.py
  EXPECT: desktop documentation checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/users/brenn/documents/ai for car parts; path=ffe930c615e4/86 entries; EXPECT=matched; output-sha256=2ce9a023d0b2f8adec5e1fbc819953f316432c3eca77088f6bd67ca1d9573df0; output-bytes=626

- [x] G10: the source-search skill supports rough exterior concept CAD and remains structurally valid
  CHECK: python3 /home/unix/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/vehicle-schematic-sourcing && python3 tests/test_source_catalog.py
  EXPECT: source catalog checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/users/brenn/documents/ai for car parts; path=ffe930c615e4/86 entries; EXPECT=matched; output-sha256=cd12c030d3d8cb17a2e94b273981429f6f2dfc98c92e008e4f9c9444282b7692; output-bytes=149

- [x] G11: the README documents the complete hackathon workflow and supported scope
  CHECK: python3 tests/test_docs.py
  EXPECT: desktop documentation checks passed
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/mnt/c/users/brenn/documents/ai for car parts; path=ffe930c615e4/86 entries; EXPECT=matched; output-sha256=f5f6b2a01f041db1360ff2a998d6eddfa65750dfb4d64fede055c10e70191865; output-bytes=143
