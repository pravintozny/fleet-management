'use strict';

const TYPES = ['preventive', 'corrective', 'inspection', 'recall'];
const STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];
const TRANSITIONS = {
  scheduled: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Validate a maintenance record. `partial` allows omitted fields (for PUT merges
 * the caller passes the merged object with partial=false).
 * Returns { errors: string[], value }.
 */
function validate(input) {
  const errors = [];
  const b = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  if (b !== input) return { errors: ['body must be a JSON object'] };

  const v = {};
  if (typeof b.vehicleId !== 'string' || !b.vehicleId.trim()) errors.push('vehicleId is required');
  else v.vehicleId = b.vehicleId.trim();

  if (!TYPES.includes(b.type)) errors.push(`type must be one of: ${TYPES.join(', ')}`);
  else v.type = b.type;

  if (typeof b.description !== 'string' || !b.description.trim()) errors.push('description is required');
  else if (b.description.length > 500) errors.push('description must be at most 500 characters');
  else v.description = b.description.trim();

  const status = b.status === undefined ? 'scheduled' : b.status;
  if (!STATUSES.includes(status)) errors.push(`status must be one of: ${STATUSES.join(', ')}`);
  else v.status = status;

  if (!isDate(b.scheduledDate)) errors.push('scheduledDate must be a valid YYYY-MM-DD date');
  else v.scheduledDate = b.scheduledDate;

  if (b.completedDate !== undefined && b.completedDate !== null && b.completedDate !== '') {
    if (!isDate(b.completedDate)) errors.push('completedDate must be a valid YYYY-MM-DD date');
    else if (b.completedDate > today()) errors.push('completedDate cannot be in the future');
    else v.completedDate = b.completedDate;
  }
  if (v.status === 'completed') {
    if (!v.completedDate && !errors.some((e) => e.startsWith('completedDate'))) {
      errors.push('completedDate is required when status is completed');
    }
  } else if (v.completedDate) {
    errors.push('completedDate is only allowed when status is completed');
  }

  for (const k of ['cost', 'odometer', 'nextServiceOdometer']) {
    if (b[k] === undefined || b[k] === null || b[k] === '') continue;
    if (typeof b[k] !== 'number' || !Number.isFinite(b[k]) || b[k] < 0) errors.push(`${k} must be a non-negative number`);
    else v[k] = b[k];
  }
  if (v.nextServiceOdometer !== undefined && v.odometer !== undefined && v.nextServiceOdometer <= v.odometer) {
    errors.push('nextServiceOdometer must be greater than odometer');
  }

  if (b.nextServiceDate !== undefined && b.nextServiceDate !== null && b.nextServiceDate !== '') {
    if (!isDate(b.nextServiceDate)) errors.push('nextServiceDate must be a valid YYYY-MM-DD date');
    else if (isDate(b.scheduledDate) && b.nextServiceDate <= b.scheduledDate) {
      errors.push('nextServiceDate must be after scheduledDate');
    } else v.nextServiceDate = b.nextServiceDate;
  }

  for (const k of ['vendor', 'notes']) {
    if (b[k] === undefined || b[k] === null || b[k] === '') continue;
    if (typeof b[k] !== 'string' || b[k].length > 500) errors.push(`${k} must be a string of at most 500 characters`);
    else v[k] = b[k].trim();
  }
  return { errors, value: v };
}

function canTransition(from, to) {
  return from === to || (TRANSITIONS[from] || []).includes(to);
}

module.exports = { validate, canTransition, isDate, today, TYPES, STATUSES };
