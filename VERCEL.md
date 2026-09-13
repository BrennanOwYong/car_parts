# FORMA on Vercel

Public deployment: https://forma-car-parts.vercel.app

Published 2026-09-13 to `forma-car-parts` in the existing `brennanowyongs-projects` Hobby workspace. Vercel deployment: `dpl_2vXXaqdDg65L6rPf9yAYNAz32HT2`. The deployment uses the local repository files at upload time, including the deployment adapters. The GitHub automatic connection was not established; subsequent publication currently uses the deployment command below. No model-service key was added to Vercel.

The repository root is the Vercel project root. Use the free Hobby plan, no paid add-ons, the provided build settings, and the generated `vercel.app` domain.

The static build lives in `design_mod/dist`. A Node.js function serves the vehicle catalogs and design exports. A Python function runs the existing repair conversation directly, without launching a local child process.

The build copies prepared repair references into `repair-runtime-assets`, outside the browser's public folder. The Python function reads this private build copy when `VERCEL=1`. This avoids runtime packaging that excludes public asset folders; the Node.js catalog and public viewer retain their original paths.

Design download identifiers encode only validated public vehicle/style selections. Downloads regenerate the geometry on demand, so they work across separate function instances and restarts without a database or paid storage service. Existing local usage continues through `design_mod/server.mjs`.

Photo requests are capped at 4,000,000 bytes before transmission, below Vercel's 4.5 MB function limit. Repair responses use the same bound and the repair function allows 240 seconds. Production credentials belong in Vercel environment variables; `.env` files are excluded from upload. Without `OPENAI_API_KEY`, the public model viewer and design exports work and repair reports that live review is not configured. Hosting on Hobby does not provide free external model-service usage.

Deploy from the repository root after Vercel sign-in:

```powershell
npx vercel login
npx vercel link
npx vercel deploy --prod
```

No secret should be passed in a command argument, uploaded as a source file, or included in browser assets. The Vercel command supports passing an environment value through standard input when explicitly configuring the model service.

## Official references

Checked 2026-09-13:

- https://vercel.com/docs/projects/deploy-from-cli
- https://vercel.com/docs/cli/env
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/functions/runtimes/python/api-directory
- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/routing/rewrites
- https://vercel.com/docs/functions/limitations
