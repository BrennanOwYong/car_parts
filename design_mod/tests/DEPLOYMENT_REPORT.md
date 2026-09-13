# Deployment verification

Checked 2026-09-13 by the delegated testing agent against real local servers. No successful model-service replies were mocked, and no paid Astra request was made.

- All 17 existing Node tests passed after the deployment changes.
- Both new deployment adapter tests passed. These launch real Node and Python servers. Exported archive contents and individual files remain available from a new Node process. Both streamed and platform-parsed request bodies are covered by the combined test suites.
- The Python adapter reports an unconfigured public service correctly, rejects malformed requests and foreign origins, returns 413 for a body beyond its 4 MB limit, and returns a useful 503 for a valid request without a service key.
- Production build passed. Its existing Three.js bundle size warning remains non-blocking.
- The production browser check passed all nine check groups with no browser exceptions. Actual landing, Ferrari, and prepared Corolla models, model decoder, and texture requests all returned 200.
- The browser configured front and side modifications, downloaded an archive, and matched individual downloads to its contents. Exported front lip contains 44 triangles; each side skirt contains 20. All three files contain finite, closed geometry with positive volume, millimetre dimensions, and their lowest point at zero on the vertical axis.
- Repair showroom, prepared vehicle loading, explode control, part selection, and isolation passed. The current registry has one prepared local demonstration and four source vehicles awaiting preparation.
- Deployment input manifest passed: 63 files totaling 24.16 MB. Environment files, account state, repository history, old build output, dependencies, tests, and memories are excluded. Uploaded text files contain no credential/private-key patterns. Required models, source references, and runtime modules are included.

The first development-server run passed the application interactions but recorded two reload-socket errors because another local development server already owned the reload port. Repeating against the production server passed with zero errors.

Local browser artifacts: `C:/Users/brenn/AppData/Local/Temp/forma-deployment-production/`.

Public checks at `https://forma-car-parts.vercel.app` passed unauthenticated access, landing and design model loading, selected geometry export, archive and individual downloads, invalid requests, and prepared repair model interaction. Status and both catalogs return 200; environment and repository-config paths return 404. No service key is configured.

Final focused public repair verification passed at 07:58 UTC against deployment `dpl_2vXXaqdDg65L6rPf9yAYNAz32HT2`. The current repair interface loads its real prepared vehicle, supports explosion and part isolation, returns the useful unconfigured-service 503, and preserves the uploaded test photo and message with Send enabled again. There were zero browser exceptions and all model requests completed with 200.

An earlier Python packaging failure was fixed: the Vercel Python builder excludes files under `public` by default. The root build now copies prepared references into the private `repair-runtime-assets` directory. A new root build plus both live adapter tests with `VERCEL=1` passed, followed by the corrected hosted response and browser flow.

The initial public repair run exceeded the former 45-second test allowance during asset loading. The final run recorded the first 9.36 MB model transfer completing in 71 seconds and the next request in 5.79 seconds; selection-to-ready time was 14.47 seconds. This is a measured connection/asset-load limitation, with no model parsing or application exception observed.

Public browser artifacts are in `C:/Users/brenn/AppData/Local/Temp/forma-deployment-public/` for the main/design run and `C:/Users/brenn/AppData/Local/Temp/forma-deployment-public-repair-final/` for final repair verification. All deployment checks are complete. Paid model generation was intentionally not exercised because no public service key is configured.

## Reproduce

```powershell
$env:FORMA_PLAYWRIGHT_MODULE='C:/usr/local/node_modules/playwright'
node design_mod/tests/deployment-smoke.mjs https://YOUR-DEPLOYMENT.vercel.app
```

For a deployment intentionally lacking paid model access, set `FORMA_EXPECT_UNCONFIGURED=1` before running. Reports and screenshots default to the operating system's temporary directory; override using `FORMA_TEST_OUTPUT`.
