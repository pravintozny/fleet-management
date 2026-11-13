import type { CreateVehicleInput } from './types.ts';

export const mockVehicles: CreateVehicleInput[] = [
  { registrationNumber: 'KA01AB1234', vin: '1HGCM82633A004352', make: 'Toyota', model: 'Hilux', year: 2021, type: 'truck', fuelType: 'diesel', capacity: 5, odometerKm: 42000 },
  { registrationNumber: 'KA02CD5678', vin: '2FTRX18W1XCA01234', make: 'Ford', model: 'Transit', year: 2022, type: 'van', fuelType: 'diesel', capacity: 3, odometerKm: 18000 },
  { registrationNumber: 'KA03EF9012', vin: 'JTDKB20U793012345', make: 'Toyota', model: 'Prius', year: 2020, type: 'car', fuelType: 'hybrid', capacity: 5, odometerKm: 67000 },
  { registrationNumber: 'KA04GH3456', vin: '5YJ3E1EA7KF317000', make: 'Tesla', model: 'Model 3', year: 2023, type: 'car', fuelType: 'electric', capacity: 5, odometerKm: 9000, status: 'inactive' },
  { registrationNumber: 'KA05JK7890', vin: 'WDB9634031L123456', make: 'Mercedes-Benz', model: 'Tourismo', year: 2019, type: 'bus', fuelType: 'diesel', capacity: 50, odometerKm: 210000 },
];
