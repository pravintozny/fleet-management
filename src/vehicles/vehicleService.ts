import { ConflictError, NotFoundError, ValidationError } from '../shared/errors.ts';
import { defaultIdGenerator, type Clock, type IdGenerator, type Repository } from '../shared/repository.ts';
import type {
  CreateVehicleInput, UpdateVehicleInput, Vehicle, VehicleFilter, VehicleStatus,
} from './types.ts';
import {
  normalizeRegistration, normalizeVin, validateCreateVehicle, validateUpdateVehicle,
} from './validation.ts';

/** Allowed status transitions. `retired` is terminal. */
export const STATUS_TRANSITIONS: Record<VehicleStatus, VehicleStatus[]> = {
  active: ['inactive', 'in_maintenance', 'retired'],
  inactive: ['active', 'in_maintenance', 'retired'],
  in_maintenance: ['active', 'inactive', 'retired'],
  retired: [],
};

/** Port: lets vehicles check drivers without depending on the drivers module. */
export interface DriverDirectory {
  isAssignable(driverId: string): boolean;
  exists(driverId: string): boolean;
}

export interface VehicleServiceDeps {
  repo: Repository<Vehicle>;
  drivers?: DriverDirectory;
  clock?: Clock;
  ids?: IdGenerator;
}

export class VehicleService {
  private readonly repo: Repository<Vehicle>;
  private readonly drivers?: DriverDirectory;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;

  constructor(deps: VehicleServiceDeps) {
    this.repo = deps.repo;
    this.drivers = deps.drivers;
    this.clock = deps.clock ?? (() => new Date());
    this.ids = deps.ids ?? defaultIdGenerator;
  }

  create(input: CreateVehicleInput): Vehicle {
    validateCreateVehicle(input);
    const registrationNumber = normalizeRegistration(input.registrationNumber);
    const vin = normalizeVin(input.vin);
    this.assertUnique(registrationNumber, vin);
    const now = this.clock().toISOString();
    return this.repo.save({
      ...input,
      id: this.ids('veh'),
      registrationNumber,
      vin,
      make: input.make.trim(),
      model: input.model.trim(),
      odometerKm: input.odometerKm ?? 0,
      status: input.status ?? 'active',
      assignedDriverId: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  get(id: string): Vehicle {
    const v = this.repo.get(id);
    if (!v) throw new NotFoundError('Vehicle', id);
    return v;
  }

  list(filter: VehicleFilter = {}): Vehicle[] {
    const q = filter.search?.trim().toLowerCase();
    return this.repo.list().filter((v) =>
      (!filter.status || v.status === filter.status) &&
      (!filter.type || v.type === filter.type) &&
      (filter.assigned === undefined || (v.assignedDriverId !== null) === filter.assigned) &&
      (!q || [v.registrationNumber, v.vin, v.make, v.model].some((s) => s.toLowerCase().includes(q))),
    );
  }

  update(id: string, patch: UpdateVehicleInput): Vehicle {
    const current = this.get(id);
    validateUpdateVehicle(patch);
    if (current.status === 'retired') throw new ConflictError('Retired vehicles cannot be modified');
    const next: Vehicle = { ...current };
    for (const [k, val] of Object.entries(patch)) if (val !== undefined) (next as any)[k] = val;
    if (patch.registrationNumber) next.registrationNumber = normalizeRegistration(patch.registrationNumber);
    if (patch.vin) next.vin = normalizeVin(patch.vin);
    if (patch.make) next.make = patch.make.trim();
    if (patch.model) next.model = patch.model.trim();
    if (patch.odometerKm !== undefined && patch.odometerKm < current.odometerKm)
      throw new ValidationError(['odometerKm cannot decrease']);
    if (patch.status && patch.status !== current.status) this.assertTransition(current.status, patch.status);
    this.assertUnique(next.registrationNumber, next.vin, id);
    next.updatedAt = this.clock().toISOString();
    if (next.status === 'retired') next.assignedDriverId = null;
    return this.repo.save(next);
  }

  changeStatus(id: string, status: VehicleStatus): Vehicle {
    return this.update(id, { status });
  }

  retire(id: string): Vehicle {
    return this.changeStatus(id, 'retired');
  }

  delete(id: string): void {
    const v = this.get(id);
    if (v.assignedDriverId) throw new ConflictError('Unassign the driver before deleting the vehicle');
    this.repo.delete(id);
  }

  assignDriver(vehicleId: string, driverId: string): Vehicle {
    const v = this.get(vehicleId);
    if (v.status !== 'active') throw new ConflictError('Only active vehicles can be assigned a driver');
    if (this.drivers) {
      if (!this.drivers.exists(driverId)) throw new NotFoundError('Driver', driverId);
      if (!this.drivers.isAssignable(driverId))
        throw new ConflictError('Driver is not assignable (inactive, suspended or licence expired)');
    }
    const other = this.repo.list().find((x) => x.assignedDriverId === driverId && x.id !== vehicleId);
    if (other) throw new ConflictError(`Driver is already assigned to vehicle ${other.id}`);
    return this.repo.save({ ...v, assignedDriverId: driverId, updatedAt: this.clock().toISOString() });
  }

  unassignDriver(vehicleId: string): Vehicle {
    const v = this.get(vehicleId);
    return this.repo.save({ ...v, assignedDriverId: null, updatedAt: this.clock().toISOString() });
  }

  /** Called when a driver is removed/suspended so no vehicle keeps a dangling assignment. */
  releaseDriver(driverId: string): void {
    for (const v of this.repo.list())
      if (v.assignedDriverId === driverId) this.unassignDriver(v.id);
  }

  private assertTransition(from: VehicleStatus, to: VehicleStatus) {
    if (!STATUS_TRANSITIONS[from].includes(to))
      throw new ConflictError(`Invalid status transition ${from} -> ${to}`);
  }

  private assertUnique(reg: string, vin: string, selfId?: string) {
    for (const v of this.repo.list()) {
      if (v.id === selfId) continue;
      if (v.registrationNumber === reg) throw new ConflictError(`Registration number already exists: ${reg}`);
      if (v.vin === vin) throw new ConflictError(`VIN already exists: ${vin}`);
    }
  }
}
