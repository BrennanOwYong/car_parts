// Vercel Node.js request/response contract (checked 2026-09-13):
// https://vercel.com/docs/functions/runtimes/node-js
// https://vercel.com/docs/routing/rewrites
import {api} from '../design_mod/server.mjs';

export default async function handler(req, res) {
  const endpoint = new URL(req.url, 'https://forma.invalid').searchParams.get('endpoint') || req.query?.endpoint;
  if (typeof endpoint !== 'string' || !/^(catalog|repair\/catalog|exports(?:\/[\w-]+\/[\w.-]+)?)$/.test(endpoint)) {
    res.writeHead(404, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: 'Endpoint not found.'}));
    return;
  }
  req.url = `/api/${endpoint}`;
  try {
    await api(req, res);
  } catch {
    if (!res.headersSent) res.writeHead(503, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: 'FORMA could not complete this request. Please retry.'}));
  }
}
