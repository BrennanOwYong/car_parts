# FORMA static Site verification

Passed on 2026-09-13 at 08:48 UTC against the completed local build at `http://127.0.0.1:8792/`.

The delegated testing agent exercised the real static server and Chromium browser without mocked responses. The Site checkout was only read; no source, build, publishing, or repository operations were performed by this agent.

- Static design and repair catalogs load, with repair status correctly unconfigured.
- All 63 body-kit combinations pass. Their 192 individual stereolithography (STL) part files have finite vertices, closed edges, positive volume, millimetre dimensions, and the correct vertical orientation. Selection manifests, part counts, reported dimensions, archives, and individual download bytes match.
- The landing vehicle and Ferrari design model load. Choosing front and side modifications selects the correct static export. Browser downloads of the archive and an individual STL succeed and match the generated files.
- The repair showroom and prepared Corolla load. Explosion, part selection, and isolation work.
- Adding a test image and message, then pressing Send, displays the honest unavailable-review explanation. The photo and message remain present and Send stays enabled. There are no outgoing POST requests or calls to the old application programming interface (API) routes.
- There are no browser exceptions or failed model, decoder, or texture loads.

No paid service calls were made. No remote Site verification was performed, and none is scheduled after publication.

The reusable runner is `tests/sites-transfer/static-site-check.mjs` in the original car-parts repository. It rejects remote addresses to enforce local verification. Detailed results and screenshots are at `C:/Users/brenn/AppData/Local/Temp/forma-sites-transfer/`.

```powershell
$env:FORMA_PLAYWRIGHT_MODULE='C:/usr/local/node_modules/playwright'
node tests/sites-transfer/static-site-check.mjs http://127.0.0.1:8792
```
