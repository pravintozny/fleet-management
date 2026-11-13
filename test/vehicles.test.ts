import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFleetServices, mockVehicles, ConflictError, NotFoundError, ValidationError } from '../src/index.ts';

const fixed = () => new Date('2026-06-01T00:00:00Z');
const setup = () => createFleetServices({ clock: fixed });
const base = mockVehicles[0];

test('create normalises and applies defaults', () => {
  const { vehicles } = setup();
  const v = vehicles.create({ ...base, registrationNumber: ' ka 01 ab 1234 ', vin: base.vin.toLowerCase() });
  assert.equal(v.registrationNumber, 'KA01AB1234');
  assert.equal(v.vin, base.vin);
  assert.equal(v.status, 'active');
  assert.equal(v.assignedDriverId, null);
  assert.equal(v.createdAt, '2026-06-01T00:00:00.000Z');
});

test('validation collects all issues', () => {
  const { vehicles } = setup();
  assert.throws(
    () => vehicles.create({ ...base, vin: 'BAD', year: 1800, capacity: 0, make: ' ' }),
    (e: any) => e instanceof ValidationError && e.issues.length === 4,
  );
});

test('duplicate registration / VIN rejected', () => {
  const { vehicles } = setup();
  vehicles.create(base);
  assert.throws(() => vehicles.create({ ...mockVehicles[1], registrationNumber: base.registrationNumber }), ConflictError);
  assert.throws(() => vehicles.create({ ...mockVehicles[1], vin: base.vin }), ConflictError);
});

test('get unknown throws NotFoundError', () => {
  assert.throws(() => setup().vehicles.get('nope'), NotFoundError);
});

test('list filters and search', () => {
  const { vehicles } = setup();
  mockVehicles.forEach((m) => vehicles.create(m));
  assert.equal(vehicles.list().length, 5);
  assert.equal(vehicles.list({ status: 'inactive' }).length, 1);
  assert.equal(vehicles.list({ type: 'bus' }).length, 1);
  assert.equal(vehicles.list({ search: 'toyota' }).length, 2);
  assert.equal(vehicles.list({ assigned: true }).length, 0);
});

test('update: odometer cannot decrease, partial validation works', () => {
  const { vehicles } = setup();
  const v = vehicles.create(base);
  assert.equal(vehicles.update(v.id, { odometerKm: 50000 }).odometerKm, 50000);
  assert.throws(() => vehicles.update(v.id, { odometerKm: 10 }), ValidationError);
  assert.throws(() => vehicles.update(v.id, { year: 1700 }), ValidationError);
});

test('status transitions; retired is terminal', () => {
  const { vehicles } = setup();
  const v = vehicles.create(base);
  assert.equal(vehicles.changeStatus(v.id, 'in_maintenance').status, 'in_maintenance');
  vehicles.retire(v.id);
  assert.throws(() => vehicles.changeStatus(v.id, 'active'), ConflictError);
  assert.throws(() => vehicles.update(v.id, { make: 'X' }), ConflictError);
});

test('delete removes vehicle', () => {
  const { vehicles } = setup();
  const v = vehicles.create(base);
  vehicles.delete(v.id);
  assert.throws(() => vehicles.get(v.id), NotFoundError);
});

test('returned objects are copies', () => {
  const { vehicles } = setup();
  const v = vehicles.create(base);
  v.make = 'Hacked';
  assert.equal(vehicles.get(v.id).make, 'Toyota');
});
