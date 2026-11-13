import { ValidationError } from '../shared/errors.ts';
import {
  FUEL_TYPES, VEHICLE_STATUSES, VEHICLE_TYPES,
  type CreateVehicleInput, type UpdateVehicleInput,
} from './types.ts';

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/; // 17 chars, no I, O, Q

export const normalizeRegistration = (r: string) => r.trim().toUpperCase().replace(/\s+/g, '');
export const normalizeVin = (v: string) => v.trim().toUpperCase();

function check(input: Partial<CreateVehicleInput>, partial: boolean): string[] {
  const issues: string[] = [];
  const req = (k: keyof CreateVehicleInput) => !partial || input[k] !== undefined;
  const str = (k: 'registrationNumber' | 'make' | 'model') => {
    if (req(k) && (typeof input[k] !== 'string' || !input[k]!.trim())) issues.push(`${k} is required`);
  };
  str('registrationNumber'); str('make'); str('model');
  if (req('vin') && (typeof input.vin !== 'string' || !VIN_RE.test(normalizeVin(input.vin))))
    issues.push('vin must be 17 alphanumeric characters (no I, O, Q)');
  const maxYear = new Date().getFullYear() + 1;
  if (req('year') && (!Number.isInteger(input.year) || input.year! < 1900 || input.year! > maxYear))
    issues.push(`year must be an integer between 1900 and ${maxYear}`);
  if (req('capacity') && (!Number.isInteger(input.capacity) || input.capacity! < 1))
    issues.push('capacity must be a positive integer');
  if (input.odometerKm !== undefined && (!Number.isFinite(input.odometerKm) || input.odometerKm < 0))
    issues.push('odometerKm must be a non-negative number');
  if (req('type') && !VEHICLE_TYPES.includes(input.type!)) issues.push(`type must be one of ${VEHICLE_TYPES.join(', ')}`);
  if (req('fuelType') && !FUEL_TYPES.includes(input.fuelType!)) issues.push(`fuelType must be one of ${FUEL_TYPES.join(', ')}`);
  if (input.status !== undefined && !VEHICLE_STATUSES.includes(input.status))
    issues.push(`status must be one of ${VEHICLE_STATUSES.join(', ')}`);
  return issues;
}

export function validateCreateVehicle(input: CreateVehicleInput): void {
  const issues = check(input, false);
  if (issues.length) throw new ValidationError(issues);
}
export function validateUpdateVehicle(input: UpdateVehicleInput): void {
  const issues = check(input, true);
  if (issues.length) throw new ValidationError(issues);
}
