# Vercel deployment findings — 2026-09-13

- FORMA's local Node.js server launches Python as a child process for repair. Vercel deployment uses a separate Python function that imports the existing repair contract directly.
- Export creation and download requests may reach different function instances. Storing exports in a module-level Map makes a later download unreliable. The deployment change encodes validated public design selections in the download identifier and regenerates the same geometry per request.
- Vercel Node.js handlers may provide an already parsed `req.body`; reading only the request stream can produce an empty body. The shared handler supports both forms.
- The local repair flow accepts up to six encoded photos, which can exceed Vercel's 4.5 MB body limit together. The browser and deployed repair adapter use a 4,000,000-byte bound.
- The native accessibility snapshot for the signed-in Vercel dashboard returned “Accessibility capture belongs to a previous page” even after reacquiring the tab. The supported browser `playwright.domSnapshot()` returned the current page correctly.

Specific official implementation references are preserved in `VERCEL.md` and the deployed adapter modules.

- The installed `@vercel/python` builder explicitly excludes `**/public/**` by default. The first cloud deployment omitted the prepared repair files, and adding `includeFiles` for the public paths still did not restore them in the deployed function. The build now copies them to `repair-runtime-assets` outside `public`; Python selects that copy under `VERCEL=1`. The Node.js function successfully includes the original public path. Do not infer Python file availability from a successful public asset request.
