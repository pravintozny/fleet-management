import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalytics } from '../src/analytics/analyticsService.js';
import { createServer } from '../src/server.js';

const vehicles = [
  { id: 'a', name: 'A', type: 'van', status: 'active', utilization: 80, kmThisMonth: 100 },
  { id: 'b', name: 'B', type: 'van', status: 'idle', utilization: 40, kmThisMonth: 50 },
  { id: 'c', name: 'C', type: 'car', status: 'maintenance', utilization: 10, kmThisMonth: 5 },
  { id: 'd', name: 'D', type: 'car', status: 'out_of_service', utilization: 0, kmThisMonth: 0 },
];
const monthly = [
  { month: '2026-01', distanceKm: 1000, fuelCost: 200, maintenanceCost: 50, utilization: 50 },
  { month: '2026-02', distanceKm: 1100, fuelCost: 220, maintenanceCost: 55, utilization: 55 },
];

test('computes KPIs and status counts', () => {
  const a = buildAnalytics({ vehicles, monthly });
  assert.equal(a.kpis.totalVehicles, 4);
  assert.equal(a.kpis.availabilityRate, 50);
  assert.equal(a.kpis.avgUtilization, 60);
  assert.equal(a.kpis.distanceChangePct, 10);
  assert.equal(a.kpis.costPerKm, 0.25);
  assert.deepEqual(a.statusCounts, { active: 1, idle: 1, maintenance: 1, out_of_service: 1 });
  assert.equal(a.topVehicles[0].id, 'a');
});

test('handles empty fleet', () => {
  const a = buildAnalytics({ vehicles: [], monthly: [] });
  assert.equal(a.kpis.availabilityRate, 0);
  assert.equal(a.kpis.costPerKm, null);
});

test('serves /api/analytics and the page', async () => {
  const server = createServer().listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const r = await fetch(base + '/api/analytics');
    assert.equal(r.status, 200);
    assert.ok((await r.json()).kpis.totalVehicles > 0);
    assert.equal((await fetch(base + '/api/analytics', { method: 'POST' })).status, 405);
    const page = await fetch(base + '/');
    assert.match(await page.text(), /Fleet Analytics/);
  } finally { server.close(); }
});
