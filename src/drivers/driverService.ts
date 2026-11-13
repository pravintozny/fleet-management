import { ConflictError, NotFoundError } from '../shared/errors.ts';
import { defaultIdGenerator, type Clock, type IdGenerator, type Repository } from '../shared/repository.ts';
import type {
  CreateDriverInput, Driver, DriverFilter, DriverStatus, UpdateDriverInput,
} from './types.ts';
import {
  normalizeEmail, normalizeLicense, validateCreateDriver, validateUpdateDriver,
} from './validation.ts';

export interface DriverServiceDeps {
  repo: Repository<Driver>;
  clock?: Clock;
  ids?: IdGenerator;
  /** Invoked when a driver becomes unassignable or is deleted (e.g. VehicleService.releaseDriver). */
  onDriverUnavailable?: (driverId: string) => void;
}

const DAY_MS = 86_400_000;

export class DriverService {
  private readonly repo: Repository<Driver>;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly onUnavailable?: (driverId: string) => void;

  constructor(deps: DriverServiceDeps) {
    this.repo = deps.repo;
    this.clock = deps.clock ?? (() => new Date());
    this.ids = deps.ids ?? defaultIdGenerator;
    this.onUnavailable = deps.onDriverUnavailable;
  }

  private today(): string {
    return this.clock().toISOString().slice(0, 10);
  }

  create(input: CreateDriverInput): Driver {
    validateCreateDriver(input, this.today());
    const licenseNumber = normalizeLicense(input.licenseNumber);
    const email = normalizeEmail(input.email);
    this.assertUnique(licenseNumber, email);
    const now = this.clock().toISOString();
    return this.repo.save({
      ...input,
      id: this.ids('drv'),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone.trim(),
      licenseNumber,
      email,
      status: input.status ?? 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  get(id: string): Driver {
    const d = this.repo.get(id);
    if (!d) throw new NotFoundError('Driver', id);
    return d;
  }

  exists(id: string): boolean {
    return this.repo.get(id) !== undefined;
  }

  list(filter: DriverFilter = {}): Driver[] {
    const q = filter.search?.trim().toLowerCase();
    const limit = filter.licenseExpiringWithinDays;
    const now = new Date(`${this.today()}T00:00:00Z`).getTime();
    return this.repo.list().filter((d) =>
      (!filter.status || d.status === filter.status) &&
      (!filter.licenseClass || d.licenseClass === filter.licenseClass) &&
      (limit === undefined ||
        (new Date(`${d.licenseExpiry}T00:00:00Z`).getTime() - now) / DAY_MS <= limit) &&
      (!q || [d.firstName, d.lastName, `${d.firstName} ${d.lastName}`, d.email, d.licenseNumber]
        .some((s) => s.toLowerCase().includes(q))),
    );
  }

  update(id: string, patch: UpdateDriverInput): Driver {
    const current = this.get(id);
    validateUpdateDriver(patch, this.today());
    const next: Driver = { ...current };
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) (next as any)[k] = v;
    if (patch.licenseNumber) next.licenseNumber = normalizeLicense(patch.licenseNumber);
    if (patch.email) next.email = normalizeEmail(patch.email);
    if (patch.firstName) next.firstName = patch.firstName.trim();
    if (patch.lastName) next.lastName = patch.lastName.trim();
    this.assertUnique(next.licenseNumber, next.email, id);
    next.updatedAt = this.clock().toISOString();
    const saved = this.repo.save(next);
    if (!this.isAssignable(id)) this.onUnavailable?.(id);
    return saved;
  }

  changeStatus(id: string, status: DriverStatus): Driver {
    return this.update(id, { status });
  }

  delete(id: string): void {
    this.get(id);
    this.repo.delete(id);
    this.onUnavailable?.(id);
  }

  isLicenseValid(id: string): boolean {
    return this.get(id).licenseExpiry >= this.today();
  }

  /** Active, with an unexpired licence. */
  isAssignable(id: string): boolean {
    const d = this.repo.get(id);
    return !!d && d.status === 'active' && d.licenseExpiry >= this.today();
  }

  private assertUnique(license: string, email: string, selfId?: string) {
    for (const d of this.repo.list()) {
      if (d.id === selfId) continue;
      if (d.licenseNumber === license) throw new ConflictError(`Licence number already exists: ${license}`);
      if (d.email === email) throw new ConflictError(`Email already exists: ${email}`);
    }
  }
}
