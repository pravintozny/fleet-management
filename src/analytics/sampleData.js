// Isolated SAMPLE data. Replace with real vehicle/trip/fuel/maintenance sources when available.
export const STATUSES = ['active', 'idle', 'maintenance', 'out_of_service'];

export const sampleVehicles = [
  { id: 'v-101', name: 'Van 101', type: 'van', status: 'active', utilization: 86, kmThisMonth: 3120 },
  { id: 'v-102', name: 'Van 102', type: 'van', status: 'active', utilization: 78, kmThisMonth: 2740 },
  { id: 'v-103', name: 'Van 103', type: 'van', status: 'idle', utilization: 41, kmThisMonth: 1210 },
  { id: 'v-201', name: 'Truck 201', type: 'truck', status: 'active', utilization: 92, kmThisMonth: 5480 },
  { id: 'v-202', name: 'Truck 202', type: 'truck', status: 'maintenance', utilization: 12, kmThisMonth: 640 },
  { id: 'v-203', name: 'Truck 203', type: 'truck', status: 'active', utilization: 71, kmThisMonth: 4310 },
  { id: 'v-301', name: 'Car 301', type: 'car', status: 'idle', utilization: 33, kmThisMonth: 980 },
  { id: 'v-302', name: 'Car 302', type: 'car', status: 'active', utilization: 64, kmThisMonth: 1890 },
  { id: 'v-303', name: 'Car 303', type: 'car', status: 'out_of_service', utilization: 0, kmThisMonth: 0 },
  { id: 'v-304', name: 'Car 304', type: 'car', status: 'active', utilization: 58, kmThisMonth: 1650 },
];

// Fleet-level monthly history (oldest first).
export const sampleMonthly = [
  { month: '2026-06', distanceKm: 19800, fuelCost: 6120, maintenanceCost: 1900, utilization: 58 },
  { month: '2026-07', distanceKm: 21400, fuelCost: 6580, maintenanceCost: 2400, utilization: 61 },
  { month: '2026-08', distanceKm: 22100, fuelCost: 6890, maintenanceCost: 1750, utilization: 63 },
  { month: '2026-09', distanceKm: 20900, fuelCost: 6410, maintenanceCost: 3100, utilization: 60 },
  { month: '2026-10', distanceKm: 23600, fuelCost: 7240, maintenanceCost: 2200, utilization: 65 },
  { month: '2026-11', distanceKm: 22020, fuelCost: 6760, maintenanceCost: 2050, utilization: 66 },
];
