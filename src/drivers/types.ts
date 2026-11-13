export type DriverStatus = 'active' | 'inactive' | 'suspended';
export type LicenseClass = 'A' | 'B' | 'C' | 'D' | 'E';
export const DRIVER_STATUSES: DriverStatus[] = ['active', 'inactive', 'suspended'];
export const LICENSE_CLASSES: LicenseClass[] = ['A', 'B', 'C', 'D', 'E'];

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseClass: LicenseClass;
  /** ISO date (YYYY-MM-DD) */
  licenseExpiry: string;
  dateOfBirth: string;
  status: DriverStatus;
  createdAt: string;
  updatedAt: string;
}

export type CreateDriverInput = Omit<Driver, 'id' | 'status' | 'createdAt' | 'updatedAt'> & {
  status?: DriverStatus;
};
export type UpdateDriverInput = Partial<Omit<Driver, 'id' | 'createdAt' | 'updatedAt'>>;

export interface DriverFilter {
  status?: DriverStatus;
  licenseClass?: LicenseClass;
  search?: string;
  /** only drivers whose licence expires within N days (or already expired) */
  licenseExpiringWithinDays?: number;
}
