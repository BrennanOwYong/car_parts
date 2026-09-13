# Automated checks

The browser checks use Playwright against running local servers, without replacing network responses. They cover local photo handling, actual asset rendering, interactions, downloads, and server validation. They do not claim to verify the external artificial intelligence (AI) service without a configured key and an authorized live request.

Run the current FORMA application; its repair service launches the local Python worker when required:

```powershell
cd design_mod
npm run dev
```

Install Playwright in a separate temporary tools directory if it is not already available. This keeps application dependency files unchanged:

```powershell
npm install --prefix "$env:TEMP/car-parts-browser-tests" --no-save --package-lock=false playwright
& "$env:TEMP/car-parts-browser-tests/node_modules/.bin/playwright.cmd" install chromium
$env:PLAYWRIGHT_MODULE = "$env:TEMP/car-parts-browser-tests/node_modules/playwright"
node tests/live_browser.mjs
node tests/live_fix_browser.mjs
node tests/live_showroom_browser.mjs
node tests/live_cleanup_browser.mjs
node tests/live_transition_browser.mjs
node tests/live_clipboard_browser.mjs
node tests/live_vehicle_library_browser.mjs
```

The legacy `live_browser.mjs` additionally needs `python astra_relay.py` running for the earlier standalone photo flow. The current Fix part and showroom checks need only FORMA on port 8788. `STUDIO_URL` and `RELAY_URL` override the default local addresses. `TEST_ARTIFACTS` selects the output folder; otherwise screenshots and the machine-readable report go into the system temporary directory under `car-parts-browser-results`.

`live_fix_browser.mjs` exercises the live repair page and a test-only page importing the actual viewer. It does not replace successful assistant responses. `live_showroom_browser.mjs` checks the actual shared three-dimensional (3D) showroom at four viewport sizes, verifies there are no car images or card elements, and checks real mesh selection, keyboard selection, drag behavior, scroll locking, and resumed rendering after returning from repair. It monitors actual graphics draw calls without replacing the renderer. The animation check confirms the original canvas moves into repair and returns visibly; a test-only page imports the real Showroom and checks the source triangle count and finite transforms. Ferrari and Corolla are now installed; `live_vehicle_library_browser.mjs` verifies real navigation between them, Ferrari's unavailable repair submission, and Corolla attachment. Shared helpers focus the actual catalog record through showroom arrows. The missing-key browser scenario skips when the service reports a configured key, avoiding fabricated damage requests to the external service.

Other checks:

```powershell
python -m unittest discover -s tests -p 'test_*.py'
node tests/test_photo.mjs
cd design_mod
npm test
npm run build
```

## Test environment memory

- On Windows, a subprocess cannot reliably reopen a file held by an active `NamedTemporaryFile` context. Write and close files inside `TemporaryDirectory` before passing them to the pipeline process. The earlier pipeline test's exit code 2 was this test fixture issue, not a production readiness failure.
- Local image preparation uses the browser's real decoder. A short base64 string with a plausible Portable Network Graphics (PNG) header can still be invalid. Use the repository's known image file for upload checks.
- The browser automation library can live outside the application folder. `PLAYWRIGHT_MODULE` resolves it without modifying application dependencies.
- The initial environment on 2026-09-13 had Chromium 153 available to Playwright and no configured external service key. A successful health response only proves the local relay is running.
- The user subsequently added the key; the real repair status endpoint reported `configured: true`. This establishes credential presence, not a successful external review.
- In the latest shared-world check, capturing the real graphics canvas exceeded the browser's 30-second screenshot timeout even though the page had the correct title, one canvas, and no script errors. The small label-cleanup regression therefore makes screenshots optional with `CLEANUP_SCREENSHOTS=1`; objective interaction checks remain independent of screenshot capture.
- Vite may load the viewer module with a timestamp query. Importing the plain module URL for test observation can create a second class identity, so method observers miss calls from the actual application. The transition check imports the exact module resource URL already loaded by the page; original methods and model data remain intact.
- The showroom now renders on demand. A correct idle scene need not produce new draw calls. The restoration check requests a resize and verifies the original canvas renders again instead of requiring continuous idle rendering.
- The headless transition sampler may observe only starting and final canvas positions even when real assembly offsets have already begun changing. Report that limit separately from verified 50% settling and assembled return; do not turn sparse frame observations into a claim about animation smoothness.
- Chromium's clipboard read can return an item whose `types` array is empty. Constructing a new `ClipboardItem` from that empty dictionary throws. The clipboard test filters empty items while preserving the original clipboard in memory, restores it afterward, and never prints its contents. Real image/text checks use browser clipboard writes and keyboard Ctrl+V with trusted paste events; only the files-only fallback and preparation-overlap checks use synthetic events.
- The bundled Corolla contains 88 source primitives across 43 named visual assemblies, 205,990 triangles, and six material names. Its `COROLLA.md` describes a user-supplied source; a separate candidate listing is not proof of that binary's creator or reuse license. The test mapping keeps it explicitly local and unverified.
- Corolla side metadata comes only from explicit `Left` or `Right` source labels. Other assemblies carry no inferred side. Display normalization is approximate and does not establish measured fit.
- The geometry preparation library's `prune()` removes single-color textures by default and converts their color into material factors. Use `keepSolidTextures: true` and `keepAttributes: true` when the contract requires the original textures and vertex attributes to remain present.

## Official references

Checked 2026-09-13:

- https://playwright.dev/docs/api/class-page
- https://playwright.dev/docs/api/class-locator#locator-set-input-files
- https://playwright.dev/docs/api/class-mouse#mouse-wheel
- https://playwright.dev/docs/api/class-browser#browser-new-context
- https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions
- https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write
- https://playwright.dev/docs/test-assertions
- https://gltf-transform.dev/modules/functions/interfaces/PruneOptions
