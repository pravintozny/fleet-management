import { nextId } from './store.js';

export class ValidationError extends Error {}
export class NotFoundError extends Error {}

const STATUSES = ['planned', 'in_progress', 'completed', 'cancelled'];
const TRANSITIONS = {
  planned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const str = (v, f) => {
  if (typeof v !== 'string' || !v.trim()) throw new ValidationError(`${f} is required`);
  return v.trim();
};
const num = (v, f) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new ValidationError(`${f} must be a non-negative number`);
  return v;
};

export function createTrip(store, input = {}) {
  const trip = {
    id: nextId(store, 'trip'),
    vehicleId: str(input.vehicleId, 'vehicleId'),
    driver: str(input.driver, 'driver'),
    origin: str(input.origin, 'origin'),
    destination: str(input.destination, 'destination'),
    plannedStart: input.plannedStart ?? null,
    status: 'planned',
    startOdometer: null,
    endOdometer: null,
    distanceKm: null,
    startedAt: null,
    endedAt: null,
  };
  store.trips.set(trip.id, trip);
  return trip;
}

export function getTrip(store, id) {
  const t = store.trips.get(id);
  if (!t) throw new NotFoundError(`trip ${id} not found`);
  return t;
}

export function listTrips(store, { status, vehicleId } = {}) {
  return [...store.trips.values()].filter(
    (t) => (!status || t.status === status) && (!vehicleId || t.vehicleId === vehicleId));
}

export function transitionTrip(store, id, status, { odometer } = {}) {
  const trip = getTrip(store, id);
  if (!STATUSES.includes(status)) throw new ValidationError(`invalid status ${status}`);
  if (!TRANSITIONS[trip.status].includes(status)) {
    throw new ValidationError(`cannot change trip from ${trip.status} to ${status}`);
  }
  const now = new Date().toISOString();
  if (status === 'in_progress') {
    trip.startOdometer = num(odometer, 'odometer');
    trip.startedAt = now;
  } else if (status === 'completed') {
    const end = num(odometer, 'odometer');
    if (end < trip.startOdometer) throw new ValidationError('end odometer is below start odometer');
    trip.endOdometer = end;
    trip.distanceKm = end - trip.startOdometer;
    trip.endedAt = now;
  } else {
    trip.endedAt = now;
  }
  trip.status = status;
  return trip;
}
