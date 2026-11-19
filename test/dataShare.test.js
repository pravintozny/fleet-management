import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDataShareService, toCsv, ShareError } from '../src/dataShare/index.js';

const datasets = { vehicles: [{ id: 'a', name: 'Van, "A"' }, { id: 'b', name: '=cmd' }] };
const make = (t = { v: 0 }) => ({ t, svc: createDataShareService({ datasets, now: () => t.v }) });

test('creates a share link and lets a recipient view data', () => {
  const { svc } = make();
  const s = svc.createShare({ dataset: 'vehicles', recipients: ['A@x.com', 'a@x.com'] });
  assert.deepEqual(s.recipients, ['a@x.com']);
  assert.ok(s.url.endsWith(s.token));
  const r = svc.accessShare(s.token, 'a@x.com');
  assert.equal(r.rowCount, 2);
  assert.equal(r.export, null);
});

test('download permission yields csv with escaping', () => {
  const { svc } = make();
  const s = svc.createShare({ dataset: 'vehicles', recipients: ['a@x.com'], permission: 'download', format: 'csv' });
  const csv = svc.accessShare(s.token, 'a@x.com').export;
  assert.equal(csv, 'id,name\na,"Van, ""A"""\nb,\'=cmd');
});

test('rejects non-recipients, expired and revoked shares', () => {
  const { svc, t } = make();
  const s = svc.createShare({ dataset: 'vehicles', recipients: ['a@x.com'], expiresInHours: 1 });
  assert.throws(() => svc.accessShare(s.token, 'z@x.com'), { code: 'FORBIDDEN' });
  t.v = 3600_000;
  assert.throws(() => svc.accessShare(s.token, 'a@x.com'), { code: 'EXPIRED' });
  t.v = 0;
  svc.revokeShare(s.token);
  assert.throws(() => svc.accessShare(s.token, 'a@x.com'), { code: 'REVOKED' });
});

test('validates input', () => {
  const { svc } = make();
  assert.throws(() => svc.createShare({ dataset: 'nope', recipients: ['a@x.com'] }), ShareError);
  assert.throws(() => svc.createShare({ dataset: 'vehicles', recipients: [] }), { code: 'NO_RECIPIENTS' });
  assert.throws(() => svc.createShare({ dataset: 'vehicles', recipients: ['bad'] }), { code: 'INVALID_RECIPIENT' });
  assert.equal(toCsv([]), '');
});
