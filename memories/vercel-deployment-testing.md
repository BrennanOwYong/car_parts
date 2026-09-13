# Vercel deployment test findings

Verified 2026-09-13.

- The desktop machine has Playwright at `C:/usr/local/node_modules/playwright` and cached Chromium. The deployment smoke runner accepts its location through `FORMA_PLAYWRIGHT_MODULE`; it does not require adding Playwright to production dependencies.
- Use the production server for deployment browser checks. A second development server collided with the existing development reload socket on port 24678 and produced `WebSocket closed without opened.` page exceptions even while all application interactions succeeded. `node server.mjs --production` removed those development-only exceptions.
- The actual 3D model has loaded when `#landing-load.hidden` becomes true on the landing page, `#loader.hidden` becomes true in the design studio, and `#viewer-controls.hidden` becomes false in repair. A canvas alone does not establish successful model loading.
- Download archive bytes can differ between regenerations because archive entries carry timestamps. Restart persistence is verified by extracting both archives and comparing each file, then matching the individual download bytes to the extracted file.
- The studio adapter can be tested using a real `http.createServer` that calls its exported handler. Separate Node processes prove export identifiers work without in-memory state. The adapter's query endpoint is `/api/studio?endpoint=exports/...`; the public rewrite uses `/api/exports/...`.
- The repair adapter can run under a real Python `HTTPServer`. Set `ASTRA_ENV_FILE` to a nonexistent test path and remove `OPENAI_API_KEY` from the child environment to test unconfigured public behavior without reading the developer's local service key. Importing `astra_relay` otherwise loads `.env` immediately.
- Returning 413 before consuming a 4,000,001-byte request caused the actual Python server to reset the connection while Node was still sending the body. The adapter now drains rejected request bodies within the platform's 4.5 MB maximum before responding; the live regression check passes.
- Vercel's deployed Python builder omitted `**/public/**` by default, even after explicit inclusion was requested. Public files can load correctly in the browser and Node catalog while being absent from the Python function. The resulting valid review request returned `This vehicle's source asset has not been prepared yet.` Copying the prepared model/manifest during the root build into `repair-runtime-assets` outside `public`, then selecting that directory when `VERCEL=1`, fixes the Python runtime layout. Test this with a root build followed by adapter tests inheriting `VERCEL=1`.

Official references used for the test harness:

- https://playwright.dev/docs/api/class-browser#browser-new-context
- https://playwright.dev/docs/api/class-apirequestcontext#api-request-context-post
- https://playwright.dev/docs/downloads
- https://vercel.com/docs/functions/runtimes/python#controlling-what-gets-bundled
