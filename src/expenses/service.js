import { randomUUID } from 'node:crypto';
import { CATEGORIES, STATUSES, TRANSITIONS, ValidationError, validateExpense } from './validation.js';

export class NotFoundError extends Error {}
export class ConflictError extends Error {}

/** In-memory expense service. Persistence can be swapped by replacing `store` (a Map). */
export class ExpenseService {
  constructor({ store = new Map(), now = () => new Date() } = {}) {
    this.store = store;
    this.now = now;
  }

  create(input) {
    const data = validateExpense(input, { today: this.now() });
    const ts = this.now().toISOString();
    const expense = { currency: 'USD', description: '', vendor: '', submittedBy: '', receiptRef: '', ...data,
      id: randomUUID(), status: 'draft', history: [{ status: 'draft', at: ts }], createdAt: ts, updatedAt: ts };
    this.store.set(expense.id, expense);
    return expense;
  }

  get(id) {
    const e = this.store.get(id);
    if (!e) throw new NotFoundError(`Expense ${id} not found`);
    return e;
  }

  update(id, input) {
    const e = this.get(id);
    if (e.status !== 'draft') throw new ConflictError(`Only draft expenses can be edited (status: ${e.status})`);
    const data = validateExpense(input, { partial: true, today: this.now() });
    Object.assign(e, data, { updatedAt: this.now().toISOString() });
    return e;
  }

  delete(id) {
    const e = this.get(id);
    if (e.status !== 'draft') throw new ConflictError(`Only draft expenses can be deleted (status: ${e.status})`);
    this.store.delete(id);
  }

  transition(id, to, { actor, note } = {}) {
    const e = this.get(id);
    if (!STATUSES.includes(to)) throw new ValidationError({ status: `must be one of: ${STATUSES.join(', ')}` });
    if (!TRANSITIONS[e.status].includes(to)) throw new ConflictError(`Cannot move expense from ${e.status} to ${to}`);
    if (to === 'rejected' && !(typeof note === 'string' && note.trim())) {
      throw new ValidationError({ note: 'is required when rejecting' });
    }
    const at = this.now().toISOString();
    e.status = to;
    e.updatedAt = at;
    e.history.push({ status: to, at, ...(actor ? { actor: String(actor) } : {}), ...(note ? { note: String(note) } : {}) });
    return e;
  }

  list({ vehicleId, category, status, from, to } = {}) {
    for (const [k, v, allowed] of [['category', category, CATEGORIES], ['status', status, STATUSES]]) {
      if (v !== undefined && !allowed.includes(v)) throw new ValidationError({ [k]: `must be one of: ${allowed.join(', ')}` });
    }
    return [...this.store.values()]
      .filter((e) => (!vehicleId || e.vehicleId === vehicleId) && (!category || e.category === category)
        && (!status || e.status === status) && (!from || e.date >= from) && (!to || e.date <= to))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  /** Totals by category, vehicle and status. Rejected/draft are excluded from `total` (counted in byStatus). */
  summary(filters = {}) {
    const items = this.list(filters);
    const byCategory = {}, byVehicle = {}, byStatus = {}, byCurrency = {};
    for (const e of items) {
      byStatus[e.status] = round((byStatus[e.status] ?? 0) + e.amount);
      if (e.status === 'draft' || e.status === 'rejected') continue;
      const key = `${e.currency}`;
      byCurrency[key] = round((byCurrency[key] ?? 0) + e.amount);
      byCategory[e.category] = round((byCategory[e.category] ?? 0) + e.amount);
      byVehicle[e.vehicleId] = round((byVehicle[e.vehicleId] ?? 0) + e.amount);
    }
    return { count: items.length, byCurrency, byCategory, byVehicle, byStatus,
      note: 'byCategory/byVehicle/byCurrency include submitted, approved and reimbursed expenses; amounts are not currency-converted.' };
  }
}

const round = (n) => Math.round(n * 100) / 100;
