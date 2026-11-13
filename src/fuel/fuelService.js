import { randomUUID } from 'node:crypto';
import { validateFuelEntry } from './validation.js';

export class ValidationError extends Error {
  constructor(errors) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}
export class NotFoundError extends Error {
  constructor(id) {
    super(`Fuel entry ${id} not found`);
    this.name = 'NotFoundError';
  }
}

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/** In-memory fuel log with consumption/efficiency reporting. */
export class FuelService {
  #entries = new Map();

  list({ vehicleId, from, to } = {}) {
    const f = from ? new Date(from).getTime() : -Infinity;
    const t = to ? new Date(to).getTime() : Infinity;
    return [...this.#entries.values()]
      .filter((e) => (!vehicleId || e.vehicleId === vehicleId)
        && new Date(e.date).getTime() >= f && new Date(e.date).getTime() <= t)
      .sort((a, b) => a.date.localeCompare(b.date) || a.odometer - b.odometer);
  }

  get(id) {
    const e = this.#entries.get(id);
    if (!e) throw new NotFoundError(id);
    return e;
  }

  #checkOdometer(value, ignoreId) {
    // Odometer must be monotonic with date for a vehicle.
    for (const e of this.#entries.values()) {
      if (e.id === ignoreId || e.vehicleId !== value.vehicleId) continue;
      const earlier = e.date < value.date;
      const later = e.date > value.date;
      if (earlier && e.odometer > value.odometer)
        throw new ValidationError({ odometer: `odometer cannot be lower than ${e.odometer} recorded on an earlier date` });
      if (later && e.odometer < value.odometer)
        throw new ValidationError({ odometer: `odometer cannot be higher than ${e.odometer} recorded on a later date` });
    }
  }

  create(input, opts) {
    const { errors, value } = validateFuelEntry(input, opts);
    if (value === null) throw new ValidationError(errors);
    this.#checkOdometer(value);
    const entry = { id: randomUUID(), ...value, createdAt: new Date().toISOString() };
    this.#entries.set(entry.id, entry);
    return entry;
  }

  update(id, input, opts) {
    const existing = this.get(id);
    const { errors, value } = validateFuelEntry({ ...existing, ...input }, opts);
    if (value === null) throw new ValidationError(errors);
    this.#checkOdometer(value, id);
    const entry = { ...existing, ...value, id, updatedAt: new Date().toISOString() };
    this.#entries.set(id, entry);
    return entry;
  }

  remove(id) {
    this.get(id);
    this.#entries.delete(id);
  }

  /**
   * Summary per vehicle: totals, average price, and distance-based efficiency.
   * Efficiency uses full-tank intervals: fuel bought at a fill-up covers the
   * distance since the previous full-tank fill-up.
   */
  summary({ vehicleId, from, to } = {}) {
    const entries = this.list({ vehicleId, from, to });
    const byVehicle = new Map();
    for (const e of entries) {
      if (!byVehicle.has(e.vehicleId)) byVehicle.set(e.vehicleId, []);
      byVehicle.get(e.vehicleId).push(e);
    }
    const vehicles = [...byVehicle].map(([id, list]) => {
      const totalQuantity = list.reduce((s, e) => s + e.quantity, 0);
      const totalCost = list.reduce((s, e) => s + e.totalCost, 0);
      let distance = 0;
      let fuelUsed = 0;
      let lastFull = null;
      let pending = 0;
      for (const e of list) {
        pending += e.quantity;
        if (!e.fullTank) continue;
        if (lastFull !== null) {
          distance += e.odometer - lastFull;
          fuelUsed += pending;
        }
        lastFull = e.odometer;
        pending = 0;
      }
      return {
        vehicleId: id,
        fillUps: list.length,
        totalQuantity: round(totalQuantity),
        totalCost: round(totalCost),
        averageUnitPrice: round(totalCost / totalQuantity, 3),
        distance,
        consumptionPer100km: distance > 0 ? round((fuelUsed / distance) * 100) : null,
        kmPerUnit: fuelUsed > 0 && distance > 0 ? round(distance / fuelUsed) : null,
        costPerKm: distance > 0 ? round((totalCostForInterval(list)) / distance, 3) : null,
      };
    });
    return {
      vehicles,
      fleetTotalCost: round(vehicles.reduce((s, v) => s + v.totalCost, 0)),
      fleetTotalQuantity: round(vehicles.reduce((s, v) => s + v.totalQuantity, 0)),
    };
  }
}

// Cost of fuel in the measured full-tank intervals (excludes fuel before first full fill).
function totalCostForInterval(list) {
  let cost = 0;
  let pending = 0;
  let seenFull = false;
  for (const e of list) {
    pending += e.totalCost;
    if (!e.fullTank) continue;
    if (seenFull) cost += pending;
    seenFull = true;
    pending = 0;
  }
  return cost;
}
