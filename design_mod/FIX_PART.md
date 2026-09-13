# Fix part

Run `npm run dev` in this directory and open http://localhost:8788/fix.html. The home screen's Fix part card opens this route. `npm run build` includes it in the production output.

The showroom displays a continuous row of assembled cars on one charcoal background, without boxed cards. Horizontal scrolling, arrows and keyboard navigation move through actual prepared cars. Selecting a car moves the live scene toward the left, reveals the interactive model at 50% explosion, and reveals Astra on the right. All vehicles load into one shared Three.js scene and floor, with positions spaced along the horizontal world axis. A single camera moves along the row; there are no per-car document containers, thumbnail images, slides or cards. The visible model itself is clickable. The showroom fills the viewport with no vertical scrolling. Only the car, make/year, model name and subtle arrows beside the name remain. Clicking the car enters repair. Pending assets and local-source status are recorded in the registry and handoff rather than displayed as showroom copy.

Attach up to six JPEG, PNG or WebP photos, or paste images. The browser converts them into bounded JPEG images. Photos remain local until Send. Subsequent turns include the current photos and the visible conversation history. Removing a photo clears outdated selections and requires a fresh review. User removals are carried into future conversation context. Changing cars or starting a new review clears prior photos, conversation and selections.

Astra returns the full current list of visible damage candidates from five supported families. The server validates family, side, confidence and the exact prepared asset, then resolves assembly identifiers itself. Selected surfaces pulse red slowly; reduced-motion preferences use static red. Missing surfaces and unknown sides are labeled rather than mapped to arbitrary geometry. Individual surfaces remain inspectable and isolatable.

Only explicit confirmation requests generation. Unsent corrections, changed photos or unknown sides prevent confirmation. The response must contain exactly one fitted/exploded OpenSCAD pair for each confirmed identifier. Generated text is downloaded; it is never executed by the server. These are approximate visual CAD concepts, not extracted exact replacement geometry or installation-ready parts.

## Astra connection

Set `OPENAI_API_KEY` in the repository-root `.env`, outside the browser. The existing relay loads this file. FORMA runs `repair_worker.py` as a hidden, bounded Python subprocess per request, so no separate Python web server is needed. Python 3.10+ must be installed; `FORMA_PYTHON` can name its executable. The model remains `gpt-6-astra`.

The app reports a missing key honestly and preserves photos/text for retries. Configure the key locally; do not paste it into a chat transcript or commit it. Credentials are read only by the Python process. Conversation requests retain the existing `store: false` behavior.

## Local endpoints

- `GET /api/repair/catalog`: exact external references and prepared manifests; one separately marked local demonstration.
- `GET /api/repair/status`: only whether the Astra key is configured, or a local interpreter error.
- `POST /api/repair/chat`: `phase` (`repair_chat` or `repair_chat_generate`), `vehicle_asset_id`, `images_base64` (one to six JPEGs), `messages` (up to 40 user/assistant text entries), and `selected_damage_parts`.

Damage review returns `outcome`, `userMessage`, `needsMorePhotos`, `damageParts`, `vehicleAssetId`. Each candidate includes canonical identifier, family, side, evidence, confidence and server-resolved assembly identifiers. Generation returns `repairCad` with separate fitted/exploded text payloads for exactly the confirmed identifiers. Payload size, message shape, confidence, family, side, duplicate selection and asset identity are validated before contacting the service.

## References

Official documentation consulted 2026-09-13:

- https://developers.openai.com/api/docs/guides/images-vision
- https://developers.openai.com/api/docs/guides/conversation-state
- https://nodejs.org/api/child_process.html#child_processspawncommand-args-options
- https://threejs.org/docs/pages/GLTFLoader.html
- https://threejs.org/docs/pages/OrbitControls.html



