import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FuelService, ValidationError, NotFoundError } from '../src/fuel/fuelService.js';
import { validateFuelEntry } from '../src/fuel/validation.js';
import { createServer } from '../src/server.js';

const entry = (o = {}) => ({ vehicleId: 'v1', date: '2026-01-01', fuelType: 'diesel', quantity: 40, unitPrice: 1.5, odometer: 1000, ...o });

test('validation rejects bad input with field errors', () => {
  const { errors, value } = validateFuelEntry({ quantity: -1, fuelType: 'water', date: 'nope' });
  assert.equal(value, null);
  for (const k of ['vehicleId', 'date', 'fuelType', 'quantity', 'unitPrice', 'odometer']) assert.ok(errors[k], k);
});

test('validation rejects future dates and computes total cost', () => {
  const now = new Date('2026-06-01');
  assert.ok(validateFuelEntry(entry({ date: '2026-09-01' }), { now }).errors.date);
  assert.equal(validateFuelEntry(entry(), { now }).value.totalCost, 60);
});

test('CRUD lifecycle', () => {
  const s = new FuelService();
  const e = s.create(entry());
  assert.equal(s.list().length, 1);
  assert.equal(s.update(e.id, { quantity: 50 }).totalCost, 75);
  s.remove(e.id);
  assert.throws(() => s.get(e.id), NotFoundError);
});

test('odometer must be consistent with dates', () => {
  const s = new FuelService();
  s.create(entry({ date: '2026-01-10', odometer: 2000 }));
  assert.throws(() => s.create(entry({ date: '2026-01-20', odometer: 1500 })), ValidationError);
  assert.throws(() => s.create(entry({ date: '2026-01-01', odometer: 2500 })), ValidationError);
  s.create(entry({ date: '2026-01-20', odometer: 2600 }));
});

test('summary computes consumption over full-tank intervals', () => {
  const s = new FuelService();
  s.create(entry({ date: '2026-01-01', odometer: 1000, quantity: 50 }));
  s.create(entry({ date: '2026-01-10', odometer: 1300, quantity: 20, fullTank: false }));
  s.create(entry({ date: '2026-01-15', odometer: 1500, quantity: 30 }));
  s.create(entry({ vehicleId: 'v2', quantity: 10 }));
  const { vehicles, fleetTotalCost } = s.summary();
  const v1 = vehicles.find((v) => v.vehicleId === 'v1');
  assert.equal(v1.distance, 500);
  assert.equal(v1.consumptionPer100km, 10); // (20+30)/500*100
  assert.equal(v1.kmPerUnit, 10);
  assert.equal(v1.costPerKm, 0.15);
  assert.equal(vehicles.find((v) => v.vehicleId === 'v2').consumptionPer100km, null);
  assert.equal(fleetTotalCost, 165);
});

test('HTTP API', async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  try {
    const bad = await fetch(`${base}/api/fuel`, { method: 'POST', body: '{}' });
    assert.equal(bad.status, 400);
    assert.ok((await bad.json()).details.vehicleId);
    assert.equal((await fetch(`${base}/api/fuel`, { method: 'POST', body: '{bad' })).status, 400);
    const ok = await fetch(`${base}/api/fuel`, { method: 'POST', body: JSON.stringify(entry()) });
    assert.equal(ok.status, 201);
    const { id } = await ok.json();
    assert.equal((await (await fetch(`${base}/api/fuel?vehicleId=v1`)).json()).length, 1);
    assert.equal((await (await fetch(`${base}/api/fuel/summary`)).json()).vehicles.length, 1);
    assert.equal((await fetch(`${base}/api/fuel/${id}`, { method: 'DELETE' })).status, 204);
    assert.equal((await fetch(`${base}/api/fuel/${id}`)).status, 404);
    assert.match(await (await fetch(`${base}/`)).text(), /Fuel Management/);
  } finally { server.close(); }
});
