import { InMemoryRepository } from './shared/repository.ts';
import { DriverService } from './drivers/driverService.ts';
import { VehicleService } from './vehicles/vehicleService.ts';
import type { Driver } from './drivers/types.ts';
import type { Vehicle } from './vehicles/types.ts';
import type { Clock, IdGenerator } from './shared/repository.ts';

export * from './shared/errors.ts';
export * from './shared/repository.ts';
export * from './vehicles/types.ts';
export * from './vehicles/vehicleService.ts';
export * from './vehicles/mockData.ts';
export * from './drivers/types.ts';
export * from './drivers/driverService.ts';
export * from './drivers/mockData.ts';

/** Wires both services together with in-memory repositories. */
export function createFleetServices(opts: { clock?: Clock; ids?: IdGenerator } = {}) {
  const vehicleRepo = new InMemoryRepository<Vehicle>();
  const driverRepo = new InMemoryRepository<Driver>();
  let vehicles!: VehicleService;
  const drivers = new DriverService({
    repo: driverRepo, ...opts,
    onDriverUnavailable: (id) => vehicles.releaseDriver(id),
  });
  vehicles = new VehicleService({
    repo: vehicleRepo, ...opts,
    drivers: { exists: (id) => drivers.exists(id), isAssignable: (id) => drivers.isAssignable(id) },
  });
  return { vehicles, drivers };
}
