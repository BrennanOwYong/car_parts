import {test} from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {repairRequest} from '../repair-service.mjs';

test('Actual Python worker reports configuration without returning a credential', async () => {
  const response = await repairRequest(null, true);
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(response.result), ['configured']);
  assert.equal(typeof response.result.configured, 'boolean');
});

test('Actual Python worker rejects an unsupported request before external service use', async () => {
  const response = await repairRequest({phase: 'unsupported'});
  assert.equal(response.status, 400);
  assert.match(response.result.error, /Invalid repair conversation request/);
  assert.doesNotMatch(JSON.stringify(response), /Traceback|Authorization|Bearer/);
});

test('Unavailable Python executable produces the recoverable setup message', async () => {
  const previous = process.env.FORMA_PYTHON;
  process.env.FORMA_PYTHON = path.join(os.tmpdir(), 'forma-deliberately-unavailable-python');
  try {await assert.rejects(repairRequest(null, true), /Python could not start/);}
  finally {if (previous === undefined) delete process.env.FORMA_PYTHON;else process.env.FORMA_PYTHON = previous;}
});
