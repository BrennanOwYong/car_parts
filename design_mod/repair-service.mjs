import {spawn} from 'node:child_process';
import path from 'node:path';
import {repairRoot} from './repair-catalog.mjs';

// https://nodejs.org/api/child_process.html#child_processspawncommand-args-options
export function repairRequest(payload, statusOnly = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.FORMA_PYTHON || (process.platform === 'win32' ? 'python' : 'python3'), [path.join(repairRoot, '../repair_worker.py'), ...(statusOnly ? ['--status'] : [])], {cwd: path.join(repairRoot, '..'), windowsHide: true, stdio: ['pipe', 'pipe', 'ignore']});
    let output = '', settled = false;
    const finish = (error, result) => {if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve(result);};
    const timer = setTimeout(() => {child.kill(); finish(new Error('Astra timed out. Your selection is preserved; try again.'));}, 195_000);
    child.on('error', () => finish(new Error('Python could not start. Install Python or set FORMA_PYTHON to its executable path.')));
    child.stdout.on('data', chunk => {output += chunk; if (Buffer.byteLength(output) > 5_000_000) {child.kill(); finish(new Error('Astra returned more data than this review can accept.'));}});
    child.on('close', code => {
      if (settled) return;
      try {
        if (code !== 0) throw new Error('Astra process failed.');
        const result = JSON.parse(output);
        if (![200, 400, 503].includes(result.status) || !result.result) throw new Error('Invalid Astra response.');
        finish(null, result);
      } catch {finish(new Error('Astra could not complete the request. Check the local Python setup.'));}
    });
    child.stdin.on('error', () => {});
    child.stdin.end(statusOnly ? '' : JSON.stringify(payload));
  });
}
