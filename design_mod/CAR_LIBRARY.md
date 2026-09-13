# Car model expansion research

Researched 2026-09-13. The studio now includes Ferrari 458 (34 visual assemblies), Toyota Corolla 2020 (43), and Porsche 911 Carrera 4S (36). These are actual distinct car meshes, not relabeled variants. All have exploded views, three editable regions, car-specific prototype profiles and STL exports. None is fit-verified engineering CAD. See [asset credits](public/ASSETS.md) for licenses and provenance.

The Porsche was obtained from the [PlayCanvas example distribution](https://github.com/playcanvas/web-components/blob/main/examples/assets/models/porsche-911-carrera-4s.glb). Its embedded metadata and creator API specify CC BY-SA 4.0. Exact model year remains unverified.

The remaining rows are expansion candidates, except the Corolla which is now integrated. A listing's license is a publisher claim; verify archive credits and provenance before release. No candidate below includes demonstrated engineering mounting geometry.

| Candidate | Source / author | Listed license and geometry | Next step |
| --- | --- | --- | --- |
| Toyota Corolla 2020 | [ItsDiyor](https://sketchfab.com/3d-models/toyota-corolla-2020-6d7d34ee42734d1ab28a6b1f1c5fc4fc) | CC Attribution; 206k triangles | Integrated from the user-supplied GLB, with 43 visual assemblies. Trim and attachment accuracy remain unverified. |
| Mazda RX-7 | [Anokino](https://sketchfab.com/3d-models/mazda-rx-7-car-404b2aefdf084f01bc3d75559c9c4088) | CC Attribution; 37.1k triangles | Best lightweight next candidate; verify generation/year. |
| Nissan 350Z | [fckngienaz](https://oaok.ru/cg-models/models/avtomobili/nissan_350z_game_ready_mid_poly_pbr/) | CC Attribution; 81,295 polygons; Blender 14.5 MB, FBX 4.39 MB, textures 23.32 MB | Author explicitly describes own Blender work; download requires login. Convert FBX/Blend to GLB. |
| Nissan 350Z | [David_Holiday](https://sketchfab.com/3d-models/nissan-350z-18c081f765854d249bb8dc580a1e9f7c) | CC Attribution; 66.1k triangles | Already includes spoiler; inspect stock-versus-modified geometry. |
| Mazda Miata MX-5 | [Black Snow](https://sketchfab.com/3d-models/mazda-miata-mx-5-e074e29ccc3847dca74ed5e9cb92d3e7) | CC Attribution; 414.5k triangles | Verify generation; simplify mesh and textures for browser use. |
| BMW 3 demo | [Naveen Manja](https://sketchfab.com/3d-models/bmw-3-car-demo-93fce305fc644254a20f01fda89abe97) | CC Attribution; 939.7k triangles | Exact variant unverified; substantial optimization. |
| Mazda 3 | [Suchy2137](https://sketchfab.com/3d-models/mazda-3-5d07aa27837243158c7e2e1ef29fefeb) | CC Attribution; 1M triangles | Tags suggest BK, not confirmed. Lower priority. |
| 1969 Toyota 7 | [andrew1234645](https://sketchfab.com/3d-models/1969-toyota-7-race-car-400bc482064b4474a95e155ad2b8ba37) | CC Attribution; 555.6k triangles | Creator describes own recreation; specialty entry rather than first expansion. |

Suggested next onboarding order: RX-7, creator-authored Nissan 350Z, then Miata. For installation-method and body-kit design research, see [MOUNTING_RESEARCH.md](MOUNTING_RESEARCH.md).

Sketchfab listings expose “Download 3D Model,” but actual downloading generally requires an authenticated account. Formats and archive contents above are unverified unless specifically stated. The [official download API](https://sketchfab.com/developers/download-api) supports glTF/GLB/USDZ; see [download workflow](https://sketchfab.com/developers/download-api/downloading-models).

The initially considered [2022 GR86 by Ddiaz Design](https://sketchfab.com/3d-models/2022-toyota-gr86-2724aadbf88b4706a26cf7d1b2332d0c) lists CC Attribution-NonCommercial-ShareAlike and says it is based on a Racing Master model. Those provenance and commercial-use limitations make it a poor default business-library asset.

For every approved entry, record: exact variant, author, source URL, license URL/version, archive credit text, download date, file hash, normalized dimensions and units, GLB mesh names, editable-region mapping, compatible design IDs, and separate visual/fit status. Do not infer manufacturing permission or dimensional accuracy from download availability.
