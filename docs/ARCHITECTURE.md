# Architecture

Scope: **Vehicle Management** and **Driver Management** only. Trip, fuel, maintenance, expense, tracking and analytics are intentionally out of scope.

## Layout
```
src/shared/     errors, Repository<T> port, InMemoryRepository, Clock/IdGenerator
src/vehicles/   types, validation, VehicleService, mock data
src/drivers/    types, validation, DriverService, mock data
src/index.ts    public exports + createFleetServices() composition root
test/           node:test suites (vehicles, drivers, assignment)
```

## Design
- **Service layer over a repository port.** Services hold business rules; persistence is behind `Repository<T>`, so a database adapter can replace `InMemoryRepository` without touching services. The in-memory repo stores clones, so callers cannot mutate state.
- **Injected `Clock` and `IdGenerator`** make time-dependent rules (licence expiry, minimum age) deterministic in tests.
- **Decoupled modules.** `VehicleService` depends on a `DriverDirectory` port (`exists`, `isAssignable`), not on `DriverService`. `DriverService` notifies via the `onDriverUnavailable` callback. `createFleetServices()` is the only place that wires them together.
- **Errors:** `ValidationError` (with `issues[]`), `NotFoundError`, `ConflictError` – map to 400/404/409 in any future HTTP layer.

## Vehicle rules
- Required: registration, VIN (17 chars, no I/O/Q), make, model, year (1900..next year), type, fuel type, capacity ≥ 1.
- Registration and VIN normalised (uppercase) and unique.
- Status: `active | inactive | in_maintenance | retired`; `retired` is terminal and read-only. Odometer cannot decrease.
- Cannot delete a vehicle that has a driver assigned.

## Driver rules
- Required: name, valid email/phone, licence number/class/expiry, date of birth (age ≥ 18).
- Licence number and email normalised and unique.
- Status: `active | inactive | suspended`. A driver is **assignable** only if active with an unexpired licence.
- `list({ licenseExpiringWithinDays })` supports expiry monitoring.

## Vehicle ↔ driver assignment
A vehicle has at most one driver and a driver at most one vehicle. Only `active` vehicles accept assignments. Assignments are released automatically when the driver becomes unassignable or is deleted, or when the vehicle is retired.

## Extending
Add a persistence adapter implementing `Repository<T>`; add an HTTP/UI layer calling the services; swap `mockData` for seed loaders.
