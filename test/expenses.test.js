import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ExpenseService, ConflictError, NotFoundError } from '../src/expenses/service.js';
import { ValidationError } from '../src/expenses/validation.js';
import { createApp } from '../src/server.js';

const valid = { vehicleId: 'V-1', category: 'fuel', amount: 45.5, date: '2026-01-10' };
const svc = () => new ExpenseService({ now: () => new Date('2026-06-01T00:00:00Z') });

test('create applies defaults and draft status', () => {
  const e = svc().create(valid);
  assert.equal(e.status, 'draft');
  assert.equal(e.currency, 'USD');
  assert.equal(e.history.length, 1);
});

test('validation rejects bad input', () => {
  const s = svc();
  for (const bad of [
    { ...valid, vehicleId: ' ' }, { ...valid, category: 'x' }, { ...valid, amount: -1 },
    { ...valid, amount: 1.234 }, { ...valid, amount: '5' }, { ...valid, date: '2026-02-30' },
    { ...valid, date: '2027-01-01' }, { ...valid, currency: 'usd' },
  ]) assert.throws(() => s.create(bad), ValidationError);
  assert.throws(() => s.create(null), ValidationError);
});

test('workflow transitions and rules', () => {
  const s = svc();
  const e = s.create(valid);
  assert.throws(() => s.transition(e.id, 'approved'), ConflictError);
  s.transition(e.id, 'submitted');
  assert.throws(() => s.update(e.id, { amount: 1 }), ConflictError);
  assert.throws(() => s.transition(e.id, 'rejected'), ValidationError);
  s.transition(e.id, 'rejected', { note: 'no receipt' });
  s.transition(e.id, 'draft');
  s.transition(e.id, 'submitted');
  s.transition(e.id, 'approved', { actor: 'mgr' });
  const done = s.transition(e.id, 'reimbursed');
  assert.equal(done.history.at(-1).status, 'reimbursed');
  assert.throws(() => s.transition(e.id, 'draft'), ConflictError);
  assert.throws(() => s.delete(e.id), ConflictError);
});

test('update and delete drafts; not found', () => {
  const s = svc();
  const e = s.create(valid);
  assert.equal(s.update(e.id, { amount: 10 }).amount, 10);
  s.delete(e.id);
  assert.throws(() => s.get(e.id), NotFoundError);
});

test('list filters and summary', () => {
  const s = svc();
  const a = s.create(valid);
  const b = s.create({ ...valid, vehicleId: 'V-2', category: 'tolls', amount: 10, date: '2026-02-01' });
  s.create({ ...valid, amount: 99 }); // stays draft
  s.transition(a.id, 'submitted'); s.transition(b.id, 'submitted');
  assert.equal(s.list({ vehicleId: 'V-2' }).length, 1);
  assert.equal(s.list({ from: '2026-02-01' }).length, 1);
  assert.equal(s.list({ status: 'draft' }).length, 1);
  assert.throws(() => s.list({ status: 'nope' }), ValidationError);
  const sum = s.summary();
  assert.equal(sum.count, 3);
  assert.equal(sum.byCategory.fuel, 45.5);
  assert.equal(sum.byVehicle['V-2'], 10);
  assert.equal(sum.byStatus.draft, 99);
});

test('HTTP API end to end', async () => {
  const server = createApp(svc());
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (p, method = 'GET', body) => fetch(base + p, { method, body: body && JSON.stringify(body) });
  try {
    let r = await call('/api/expenses', 'POST', { ...valid, amount: -5 });
    assert.equal(r.status, 400);
    r = await call('/api/expenses', 'POST', valid);
    assert.equal(r.status, 201);
    const e = await r.json();
    assert.equal((await call(`/api/expenses/${e.id}/submit`, 'POST')).status, 200);
    assert.equal((await call(`/api/expenses/${e.id}/submit`, 'POST')).status, 409);
    assert.equal((await call(`/api/expenses/${e.id}/reject`, 'POST', {})).status, 400);
    assert.equal((await call(`/api/expenses/${e.id}/approve`, 'POST')).status, 200);
    assert.equal((await (await call('/api/expenses?status=approved')).json()).length, 1);
    assert.equal((await (await call('/api/expenses/summary')).json()).byCategory.fuel, 45.5);
    assert.equal((await call('/api/expenses/00000000-0000-0000-0000-000000000000')).status, 404);
    assert.equal((await call('/api/expenses?status=bad')).status, 400);
    r = await fetch(base + '/api/expenses', { method: 'POST', body: '{bad' });
    assert.equal(r.status, 400);
    assert.equal((await call('/expenses')).status, 200);
  } finally { server.close(); }
});
