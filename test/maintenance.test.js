'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server');
const { validate, canTransition } = require('../src/maintenance/validation');

const valid = { vehicleId: 'V1', type: 'preventive', description: 'Oil change', scheduledDate: '2030-01-10' };

test('validate accepts minimal record and defaults status', () => {
  const { errors, value } = validate(valid);
  assert.deepEqual(errors, []);
  assert.equal(value.status, 'scheduled');
});

test('validate rejects bad input', () => {
  const bad = validate({ type: 'x', description: '', scheduledDate: '2030-02-30', cost: -1, status: 'nope' });
  assert.ok(bad.errors.length >= 6);
  assert.ok(validate({ ...valid, nextServiceDate: '2030-01-01' }).errors.some((e) => /nextServiceDate/.test(e)));
  assert.ok(validate({ ...valid, odometer: 100, nextServiceOdometer: 50 }).errors.length);
  assert.ok(validate({ ...valid, status: 'completed' }).errors.some((e) => /completedDate is required/.test(e)));
  assert.ok(validate({ ...valid, completedDate: '2999-01-01', status: 'completed' }).errors.some((e) => /future/.test(e)));
  assert.ok(validate({ ...valid, completedDate: '2020-01-01' }).errors.some((e) => /only allowed/.test(e)));
  assert.ok(validate([]).errors.length);
});

test('transitions', () => {
  assert.ok(canTransition('scheduled', 'in_progress'));
  assert.ok(!canTransition('completed', 'scheduled'));
});

async function withServer(fn) {
  const server = createServer();
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, body) => {
    const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, body: r.status === 204 ? null : await r.json() };
  };
  try { await fn(call, base); } finally { server.close(); }
}

test('API CRUD, lifecycle, filters, summary', () => withServer(async (call) => {
  let r = await call('POST', '/api/maintenance', valid);
  assert.equal(r.status, 201);
  const id = r.body.id;
  assert.equal((await call('POST', '/api/maintenance', { ...valid, type: 'bad' })).status, 400);
  r = await call('POST', '/api/maintenance', { ...valid, vehicleId: 'V2', scheduledDate: '2020-01-01' });
  assert.equal(r.status, 201);
  const overdueId = r.body.id;

  assert.equal((await call('GET', '/api/maintenance?vehicleId=V1')).body.length, 1);
  const od = await call('GET', '/api/maintenance?overdue=true');
  assert.deepEqual(od.body.map((x) => x.id), [overdueId]);

  assert.equal((await call('PUT', `/api/maintenance/${id}`, { status: 'in_progress' })).body.status, 'in_progress');
  assert.equal((await call('DELETE', `/api/maintenance/${id}`)).status, 409);
  assert.equal((await call('PUT', `/api/maintenance/${id}`, { status: 'completed' })).status, 400);
  r = await call('PUT', `/api/maintenance/${id}`, { status: 'completed', completedDate: '2020-02-02', cost: 120.5 });
  assert.equal(r.status, 200);
  assert.equal((await call('PUT', `/api/maintenance/${id}`, { description: 'x' })).status, 409);

  const s = await call('GET', '/api/maintenance/summary');
  assert.equal(s.body.totalCost, 120.5);
  assert.equal(s.body.byStatus.completed, 1);
  assert.equal(s.body.overdue, 1);

  assert.equal((await call('DELETE', `/api/maintenance/${overdueId}`)).status, 204);
  assert.equal((await call('GET', `/api/maintenance/${overdueId}`)).status, 404);
}));

test('serves UI and rejects invalid JSON', () => withServer(async (call, base) => {
  const html = await fetch(base + '/');
  assert.equal(html.status, 200);
  assert.equal((await fetch(base + '/..%2fpackage.json')).status, 404);
  const r = await fetch(base + '/api/maintenance', { method: 'POST', body: '{bad' });
  assert.equal(r.status, 400);
}));
