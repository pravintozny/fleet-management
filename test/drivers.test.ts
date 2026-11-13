import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFleetServices, mockDrivers, ConflictError, NotFoundError, ValidationError } from '../src/index.ts';

const fixed = () => new Date('2026-06-01T00:00:00Z');
const setup = () => createFleetServices({ clock: fixed });
const base = mockDrivers[0];

test('create normalises and defaults status', () => {
  const { drivers } = setup();
  const d = drivers.create({ ...base, email: 'Asha.Rao@Example.com', licenseNumber: ' ka01 20180001234 ' });
  assert.equal(d.email, 'asha.rao@example.com');
  assert.equal(d.licenseNumber, 'KA0120180001234');
  assert.equal(d.status, 'active');
});

test('validation: email, phone, dates, age', () => {
  const { drivers } = setup();
  assert.throws(
    () => drivers.create({ ...base, email: 'x', phone: 'abc', licenseExpiry: '2026-02-30', dateOfBirth: '2015-01-01' }),
    (e: any) => e instanceof ValidationError && e.issues.length === 4,
  );
});

test('18th birthday boundary', () => {
  const { drivers } = setup();
  assert.doesNotThrow(() => drivers.create({ ...base, dateOfBirth: '2008-06-01' }));
  assert.throws(() => drivers.create({ ...mockDrivers[1], dateOfBirth: '2008-06-02' }), ValidationError);
});

test('duplicate licence / email rejected', () => {
  const { drivers } = setup();
  drivers.create(base);
  assert.throws(() => drivers.create({ ...mockDrivers[1], licenseNumber: base.licenseNumber }), ConflictError);
  assert.throws(() => drivers.create({ ...mockDrivers[1], email: base.email }), ConflictError);
});

test('list filters incl. licence expiry', () => {
  const { drivers } = setup();
  mockDrivers.forEach((m) => drivers.create(m));
  assert.equal(drivers.list({ status: 'suspended' }).length, 1);
  assert.equal(drivers.list({ licenseClass: 'B' }).length, 2);
  assert.equal(drivers.list({ search: 'meera iyer' }).length, 1);
  assert.deepEqual(drivers.list({ licenseExpiringWithinDays: 30 }).map((d) => d.firstName), ['Meera']);
});

test('update + not found + delete', () => {
  const { drivers } = setup();
  const d = drivers.create(base);
  assert.equal(drivers.update(d.id, { phone: '+91 99999 00000' }).phone, '+91 99999 00000');
  drivers.delete(d.id);
  assert.throws(() => drivers.get(d.id), NotFoundError);
});

test('assignability depends on status and licence expiry', () => {
  const { drivers } = setup();
  const ok = drivers.create(mockDrivers[0]);
  const expired = drivers.create(mockDrivers[2]);
  const susp = drivers.create(mockDrivers[3]);
  assert.ok(drivers.isAssignable(ok.id));
  assert.ok(!drivers.isAssignable(expired.id));
  assert.ok(!drivers.isAssignable(susp.id));
  assert.ok(!drivers.isLicenseValid(expired.id));
});
