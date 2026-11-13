import { nextId } from './store.js';
import { ValidationError, NotFoundError, getTrip } from './trips.js';

const pos = (v, f) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) throw new ValidationError(`${f} must be a positive number`);
  return v;
};

export function addFuelLog(store, input = {}) {
  if (typeof input.vehicleId !== 'string' || !input.vehicleId.trim()) throw new ValidationError('vehicleId is required');
  if (input.tripId) {
    const trip = getTrip(store, input.tripId);
    if (trip.vehicleId !== input.vehicleId) throw new ValidationError('trip belongs to a different vehicle');
  }
  const liters = pos(input.liters, 'liters');
  const pricePerLiter = pos(input.pricePerLiter, 'pricePerLiter');
  const odometer = pos(input.odometer, 'odometer');
  const log = {
    id: nextId(store, 'fuel'),
    vehicleId: input.vehicleId.trim(),
    tripId: input.tripId ?? null,
    date: input.date ?? new Date().toISOString(),
    liters, pricePerLiter, odometer,
    totalCost: Math.round(liters * pricePerLiter * 100) / 100,
    station: input.station ?? null,
  };
  store.fuelLogs.set(log.id, log);
  return log;
}

export function listFuelLogs(store, { vehicleId, tripId } = {}) {
  return [...store.fuelLogs.values()].filter(
    (l) => (!vehicleId || l.vehicleId === vehicleId) && (!tripId || l.tripId === tripId));
}

export function deleteFuelLog(store, id) {
  if (!store.fuelLogs.delete(id)) throw new NotFoundError(`fuel log ${id} not found`);
}

// Efficiency from consecutive full-tank fill-ups: km driven since the first log
// divided by liters added after it.
export function fuelSummary(store, vehicleId) {
  const logs = listFuelLogs(store, { vehicleId }).sort((a, b) => a.odometer - b.odometer);
  const totalLiters = logs.reduce((s, l) => s + l.liters, 0);
  const totalCost = Math.round(logs.reduce((s, l) => s + l.totalCost, 0) * 100) / 100;
  let kmPerLiter = null;
  if (logs.length >= 2) {
    const km = logs.at(-1).odometer - logs[0].odometer;
    const liters = logs.slice(1).reduce((s, l) => s + l.liters, 0);
    if (km > 0 && liters > 0) kmPerLiter = Math.round((km / liters) * 100) / 100;
  }
  return { vehicleId, entries: logs.length, totalLiters, totalCost, kmPerLiter };
}
