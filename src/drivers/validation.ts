import { ValidationError } from '../shared/errors.ts';
import {
  DRIVER_STATUSES, LICENSE_CLASSES, type CreateDriverInput, type UpdateDriverInput,
} from './types.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,17}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const normalizeLicense = (l: string) => l.trim().toUpperCase().replace(/\s+/g, '');
export const normalizeEmail = (e: string) => e.trim().toLowerCase();

export function isValidDate(s: unknown): s is string {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function check(input: Partial<CreateDriverInput>, partial: boolean, today: string): string[] {
  const issues: string[] = [];
  const req = (k: keyof CreateDriverInput) => !partial || input[k] !== undefined;
  for (const k of ['firstName', 'lastName', 'licenseNumber'] as const)
    if (req(k) && (typeof input[k] !== 'string' || !input[k]!.trim())) issues.push(`${k} is required`);
  if (req('email') && (typeof input.email !== 'string' || !EMAIL_RE.test(input.email.trim()))) issues.push('email is invalid');
  if (req('phone') && (typeof input.phone !== 'string' || !PHONE_RE.test(input.phone.trim()))) issues.push('phone is invalid');
  if (req('licenseClass') && !LICENSE_CLASSES.includes(input.licenseClass!))
    issues.push(`licenseClass must be one of ${LICENSE_CLASSES.join(', ')}`);
  if (req('licenseExpiry') && !isValidDate(input.licenseExpiry)) issues.push('licenseExpiry must be a valid YYYY-MM-DD date');
  if (req('dateOfBirth')) {
    if (!isValidDate(input.dateOfBirth)) issues.push('dateOfBirth must be a valid YYYY-MM-DD date');
    else {
      const [y, m, d] = input.dateOfBirth.split('-').map(Number);
      const [ty, tm, td] = today.split('-').map(Number);
      const age = ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
      if (age < 18) issues.push('driver must be at least 18 years old');
    }
  }
  if (input.status !== undefined && !DRIVER_STATUSES.includes(input.status))
    issues.push(`status must be one of ${DRIVER_STATUSES.join(', ')}`);
  return issues;
}

export function validateCreateDriver(input: CreateDriverInput, today: string): void {
  const issues = check(input, false, today);
  if (issues.length) throw new ValidationError(issues);
}
export function validateUpdateDriver(input: UpdateDriverInput, today: string): void {
  const issues = check(input, true, today);
  if (issues.length) throw new ValidationError(issues);
}
