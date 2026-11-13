export const CATEGORIES = ['fuel', 'maintenance', 'insurance', 'tolls', 'parking', 'fines', 'registration', 'tires', 'other'];
export const STATUSES = ['draft', 'submitted', 'approved', 'rejected', 'reimbursed'];

// Allowed workflow transitions.
export const TRANSITIONS = {
  draft: ['submitted'],
  submitted: ['approved', 'rejected'],
  approved: ['reimbursed'],
  rejected: ['draft'],
  reimbursed: [],
};

export class ValidationError extends Error {
  constructor(errors) {
    super('Validation failed');
    this.errors = errors;
  }
}

const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

/** Validate and normalise expense input. partial=true for updates. */
export function validateExpense(input, { partial = false, today = new Date() } = {}) {
  const errors = {};
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError({ body: 'must be a JSON object' });
  }
  const out = {};
  const has = (k) => input[k] !== undefined;

  if (!partial || has('vehicleId')) {
    if (!nonEmpty(input.vehicleId)) errors.vehicleId = 'is required';
    else out.vehicleId = input.vehicleId.trim();
  }
  if (!partial || has('category')) {
    if (!CATEGORIES.includes(input.category)) errors.category = `must be one of: ${CATEGORIES.join(', ')}`;
    else out.category = input.category;
  }
  if (!partial || has('amount')) {
    const a = input.amount;
    if (typeof a !== 'number' || !Number.isFinite(a) || a <= 0) errors.amount = 'must be a positive number';
    else if (Math.abs(a * 100 - Math.round(a * 100)) > 1e-6) errors.amount = 'must have at most 2 decimal places';
    else if (a > 10_000_000) errors.amount = 'is too large';
    else out.amount = Math.round(a * 100) / 100;
  }
  if (!partial || has('date')) {
    if (!isDate(input.date)) errors.date = 'must be a valid YYYY-MM-DD date';
    else if (input.date > today.toISOString().slice(0, 10)) errors.date = 'cannot be in the future';
    else out.date = input.date;
  }
  if (!partial || has('currency')) {
    const c = input.currency ?? 'USD';
    if (typeof c !== 'string' || !/^[A-Z]{3}$/.test(c)) errors.currency = 'must be a 3-letter uppercase ISO code';
    else out.currency = c;
  }
  for (const k of ['description', 'vendor', 'submittedBy', 'receiptRef']) {
    if (has(k)) {
      if (typeof input[k] !== 'string' || input[k].length > 500) errors[k] = 'must be a string up to 500 characters';
      else out[k] = input[k].trim();
    }
  }
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return out;
}
