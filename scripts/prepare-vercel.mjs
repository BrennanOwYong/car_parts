// Python packaging may exclude public directories; retain a private runtime copy.
// https://vercel.com/docs/functions/runtimes/python#controlling-what-gets-bundled
import {cp, mkdir} from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const destination = new URL('repair-runtime-assets/', root);
await mkdir(destination, {recursive: true});
await cp(new URL('design_mod/public/repair-assets/', root), destination, {recursive: true});
console.log('Prepared repair references for the Python function.');
