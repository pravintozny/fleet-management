export type VehicleStatus = 'active' | 'inactive' | 'in_maintenance' | 'retired';
export type VehicleType = 'car' | 'van' | 'truck' | 'bus' | 'motorcycle';
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'lpg';

export const VEHICLE_STATUSES: VehicleStatus[] = ['active', 'inactive', 'in_maintenance', 'retired'];
export const VEHICLE_TYPES: VehicleType[] = ['car', 'van', 'truck', 'bus', 'motorcycle'];
export const FUEL_TYPES: FuelType[] = ['petrol', 'diesel', 'electric', 'hybrid', 'lpg'];

export interface Vehicle {
  id: string;
  registrationNumber: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  fuelType: FuelType;
  capacity: number;
  odometerKm: number;
  status: VehicleStatus;
  assignedDriverId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateVehicleInput = Omit<
  Vehicle,
  'id' | 'status' | 'assignedDriverId' | 'createdAt' | 'updatedAt' | 'odometerKm'
> & { odometerKm?: number; status?: VehicleStatus };

export type UpdateVehicleInput = Partial<
  Omit<Vehicle, 'id' | 'assignedDriverId' | 'createdAt' | 'updatedAt'>
>;

export interface VehicleFilter {
  status?: VehicleStatus;
  type?: VehicleType;
  search?: string;
  assigned?: boolean;
}
