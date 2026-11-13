import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/store.js';
import { createTrip, transitionTrip, listTrips } from '../src/trips.js';
import { addFuelLog, fuelSummary } from '../src/fuel.js';
import { createApp } from '../src/server.js';

const base = { vehicleId: 'V1', driver: 'Ann', origin: 'A', destination: 'B' };

test('trip lifecycle computes distance', () => {
  const s = createStore();
  const t = createTrip(s, base);
  transitionTrip(s, t.id, 'in_progress', { odometer: 100 });
  const done = transitionTrip(s, t.id, 'completed', { odometer: 250 });
  assert.equal(done.distanceKm, 150);
  assert.equal(listTrips(s, { status: 'completed' }).length, 1);
});

test('trip validation and invalid transitions', () => {
  const s = createStore();
  assert.throws(() => createTrip(s, { ...base, driver: '' }), /driver is required/);
  const t = createTrip(s, base);
  assert.throws(() => transitionTrip(s, t.id, 'completed', { odometer: 5 }), /cannot change/);
  transitionTrip(s, t.id, 'in_progress', { odometer: 100 });
  assert.throws(() => transitionTrip(s, t.id, 'completed', { odometer: 50 }), /below start/);
});

test('fuel logs, totals and efficiency', () => {
  const s = createStore();
  addFuelLog(s, { vehicleId: 'V1', liters: 40, pricePerLiter: 1.5, odometer: 1000 });
  addFuelLog(s, { vehicleId: 'V1', liters: 20, pricePerLiter: 1.5, odometer: 1300 });
  const sum = fuelSummary(s, 'V1');
  assert.equal(sum.totalCost, 90);
  assert.equal(sum.kmPerLiter, 15);
  assert.throws(() => addFuelLog(s, { vehicleId: 'V1', liters: -1, pricePerLiter: 1, odometer: 1 }), /liters/);
});

test('fuel log must match trip vehicle', () => {
  const s = createStore();
  const t = createTrip(s, base);
  assert.throws(() => addFuelLog(s, { vehicleId: 'V2', tripId: t.id, liters: 1, pricePerLiter: 1, odometer: 1 }), /different vehicle/);
});

test('HTTP API end to end', async () => {
  const server = createApp().listen(0);
  const port = server.address().port;
  const call = (p, method = 'GET', body) => fetch(`http://127.0.0.1:${port}${p}`, {
    method, headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
  try {
    const t = await (await call('/api/trips', 'POST', base)).json();
    let r = await call(`/api/trips/${t.id}/status`, 'POST', { status: 'in_progress', odometer: 10 });
    assert.equal(r.status, 200);
    r = await call(`/api/trips/${t.id}/status`, 'POST', { status: 'planned' });
    assert.equal(r.status, 400);
    r = await call('/api/fuel', 'POST', { vehicleId: 'V1', tripId: t.id, liters: 10, pricePerLiter: 2, odometer: 20 });
    assert.equal(r.status, 201);
    const f = await r.json();
    assert.equal((await call(`/api/fuel/${f.id}`, 'DELETE')).status, 204);
    assert.equal((await call('/api/trips/nope')).status, 404);
    assert.equal((await call('/')).status, 200);
  } finally { server.close(); }
});
