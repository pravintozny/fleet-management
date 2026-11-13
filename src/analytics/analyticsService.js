import { STATUSES, sampleVehicles, sampleMonthly } from './sampleData.js';

const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const pctChange = (cur, prev) => (prev ? round(((cur - prev) / prev) * 100) : null);

export function buildAnalytics({ vehicles = sampleVehicles, monthly = sampleMonthly } = {}) {
  const total = vehicles.length;
  const statusCounts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const v of vehicles) if (v.status in statusCounts) statusCounts[v.status]++;

  const available = statusCounts.active + statusCounts.idle;
  const inService = vehicles.filter((v) => v.status === 'active' || v.status === 'idle');
  const avgUtilization = inService.length
    ? round(inService.reduce((s, v) => s + v.utilization, 0) / inService.length)
    : 0;

  const byType = {};
  for (const v of vehicles) {
    const t = (byType[v.type] ??= { type: v.type, count: 0, utilSum: 0, distanceKm: 0 });
    t.count++; t.utilSum += v.utilization; t.distanceKm += v.kmThisMonth;
  }
  const utilizationByType = Object.values(byType).map((t) => ({
    type: t.type, count: t.count, avgUtilization: round(t.utilSum / t.count), distanceKm: t.distanceKm,
  }));

  const last = monthly.at(-1);
  const prev = monthly.at(-2);
  const costPerKm = (m) => (m && m.distanceKm ? round((m.fuelCost + m.maintenanceCost) / m.distanceKm, 3) : null);

  return {
    generatedAt: new Date().toISOString(),
    sample: vehicles === sampleVehicles,
    kpis: {
      totalVehicles: total,
      availabilityRate: total ? round((available / total) * 100) : 0,
      avgUtilization,
      distanceKm: last?.distanceKm ?? 0,
      distanceChangePct: pctChange(last?.distanceKm, prev?.distanceKm),
      costPerKm: costPerKm(last),
      costPerKmChangePct: pctChange(costPerKm(last), costPerKm(prev)),
    },
    statusCounts,
    utilizationByType,
    topVehicles: [...vehicles].sort((a, b) => b.utilization - a.utilization).slice(0, 5)
      .map(({ id, name, utilization }) => ({ id, name, utilization })),
    trend: monthly.map((m) => ({ ...m, costPerKm: costPerKm(m) })),
  };
}
