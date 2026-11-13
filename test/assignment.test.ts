import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFleetServices, mockDrivers, mockVehicles, ConflictError, NotFoundError } from '../src/index.ts';

const setup = () => {
  const s = createFleetServices({ clock: () => new Date('2026-06-01T00:00:00Z') });
  return {
    ...s,
    v1: s.vehicles.create(mockVehicles[0]),
    v2: s.vehicles.create(mockVehicles[1]),
    ok: s.drivers.create(mockDrivers[0]),
    expired: s.drivers.create(mockDrivers[2]),
    susp: s.drivers.create(mockDrivers[3]),
  };
};

test('assign and unassign', () => {
  const { vehicles, v1, ok } = setup();
  assert.equal(vehicles.assignDriver(v1.id, ok.id).assignedDriverId, ok.id);
  assert.equal(vehicles.list({ assigned: true }).length, 1);
  assert.equal(vehicles.unassignDriver(v1.id).assignedDriverId, null);
});

test('rejects unknown, expired, suspended drivers', () => {
  const { vehicles, v1, expired, susp } = setup();
  assert.throws(() => vehicles.assignDriver(v1.id, 'nope'), NotFoundError);
  assert.throws(() => vehicles.assignDriver(v1.id, expired.id), ConflictError);
  assert.throws(() => vehicles.assignDriver(v1.id, susp.id), ConflictError);
});

test('one vehicle per driver; only active vehicles', () => {
  const { vehicles, v1, v2, ok } = setup();
  vehicles.assignDriver(v1.id, ok.id);
  assert.throws(() => vehicles.assignDriver(v2.id, ok.id), ConflictError);
  vehicles.unassignDriver(v1.id);
  vehicles.changeStatus(v2.id, 'inactive');
  assert.throws(() => vehicles.assignDriver(v2.id, ok.id), ConflictError);
});

test('suspending or deleting a driver releases the vehicle', () => {
  const { vehicles, drivers, v1, v2, ok } = setup();
  vehicles.assignDriver(v1.id, ok.id);
  drivers.changeStatus(ok.id, 'suspended');
  assert.equal(vehicles.get(v1.id).assignedDriverId, null);
  drivers.changeStatus(ok.id, 'active');
  vehicles.assignDriver(v2.id, ok.id);
  drivers.delete(ok.id);
  assert.equal(vehicles.get(v2.id).assignedDriverId, null);
});

test('retiring a vehicle clears its driver; assigned vehicle cannot be deleted', () => {
  const { vehicles, v1, v2, ok } = setup();
  vehicles.assignDriver(v1.id, ok.id);
  assert.throws(() => vehicles.delete(v1.id), ConflictError);
  assert.equal(vehicles.retire(v1.id).assignedDriverId, null);
  assert.ok(v2);
});
