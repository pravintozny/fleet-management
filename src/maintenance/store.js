'use strict';
const { validate, canTransition, today } = require('./validation');

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

class MaintenanceStore {
  constructor() {
    this.items = new Map();
    this.seq = 0;
  }

  create(input) {
    const { errors, value } = validate(input);
    if (errors.length) throw new HttpError(400, 'validation failed', errors);
    const now = new Date().toISOString();
    const rec = { id: String(++this.seq), ...value, createdAt: now, updatedAt: now };
    this.items.set(rec.id, rec);
    return rec;
  }

  get(id) {
    const r = this.items.get(id);
    if (!r) throw new HttpError(404, 'maintenance record not found');
    return r;
  }

  update(id, patch) {
    const cur = this.get(id);
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new HttpError(400, 'validation failed', ['body must be a JSON object']);
    }
    if (['completed', 'cancelled'].includes(cur.status)) {
      throw new HttpError(409, `cannot modify a ${cur.status} record`);
    }
    const { id: _i, createdAt: _c, updatedAt: _u, ...curFields } = cur;
    const merged = { ...curFields, ...patch };
    const { errors, value } = validate(merged);
    if (errors.length) throw new HttpError(400, 'validation failed', errors);
    if (!canTransition(cur.status, value.status)) {
      throw new HttpError(409, `invalid status transition ${cur.status} -> ${value.status}`);
    }
    const rec = { id: cur.id, ...value, createdAt: cur.createdAt, updatedAt: new Date().toISOString() };
    this.items.set(id, rec);
    return rec;
  }

  delete(id) {
    const cur = this.get(id);
    if (cur.status === 'in_progress') throw new HttpError(409, 'cannot delete an in-progress record');
    this.items.delete(id);
  }

  isOverdue(r, t = today()) {
    return (r.status === 'scheduled' || r.status === 'in_progress') && r.scheduledDate < t;
  }

  list({ vehicleId, status, type, from, to, overdue } = {}) {
    let out = [...this.items.values()];
    if (vehicleId) out = out.filter((r) => r.vehicleId === vehicleId);
    if (status) out = out.filter((r) => r.status === status);
    if (type) out = out.filter((r) => r.type === type);
    if (from) out = out.filter((r) => r.scheduledDate >= from);
    if (to) out = out.filter((r) => r.scheduledDate <= to);
    if (overdue === 'true') out = out.filter((r) => this.isOverdue(r));
    return out
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || Number(a.id) - Number(b.id))
      .map((r) => ({ ...r, overdue: this.isOverdue(r) }));
  }

  summary() {
    const t = today();
    const all = [...this.items.values()];
    const byStatus = {};
    let totalCost = 0;
    const perVehicle = {};
    for (const r of all) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      const pv = (perVehicle[r.vehicleId] ||= { vehicleId: r.vehicleId, records: 0, completed: 0, totalCost: 0 });
      pv.records++;
      if (r.status === 'completed') {
        pv.completed++;
        pv.totalCost += r.cost || 0;
        totalCost += r.cost || 0;
      }
    }
    return {
      total: all.length,
      byStatus,
      overdue: all.filter((r) => this.isOverdue(r, t)).length,
      totalCost: Math.round(totalCost * 100) / 100,
      vehicles: Object.values(perVehicle).map((p) => ({ ...p, totalCost: Math.round(p.totalCost * 100) / 100 })),
    };
  }
}

module.exports = { MaintenanceStore, HttpError };
