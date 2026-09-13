# Corolla Anatomy viewer

Run `npm run dev`, then open `/corolla.html` on the server's local URL. For the standalone viewer only, run `npx vite --host 127.0.0.1 --port 5174` and open http://127.0.0.1:5174/corolla.html.

- Assemble → Explode slider, animated playback, orbit and zoom.
- Click a surface to select an assembly; isolate it for close inspection.
- Four paint finishes, assembly guide lines, and PNG capture.
- `public/assets/corolla-exploded.glb` contains 43 named visual assemblies, original textures, and a three-second explosion animation.

Source: user-supplied Toyota Corolla GLB. Spatial assembly directions follow the user-supplied sedan reference; its simplified geometry is not mixed into the Corolla. Original indexed paint islands preserve body-panel boundaries. Connected texture details are grouped by location. No original triangles are removed or replaced. These groups are visual assemblies, not a complete OEM parts catalog. Unmodeled engine and other mechanical internals are not added.

To regenerate the asset, run `python3 scripts/prepare-corolla.py` then `python3 scripts/animate-corolla.py` (NumPy is required by the first script). The first script currently uses the source path supplied in this task. The second embeds animation metadata; the viewer uses its matching metre-space offsets. `npm run build` builds both the original studio and this separate viewer.
