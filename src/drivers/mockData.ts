import type { CreateDriverInput } from './types.ts';

export const mockDrivers: CreateDriverInput[] = [
  { firstName: 'Asha', lastName: 'Rao', email: 'asha.rao@example.com', phone: '+91 98450 11111', licenseNumber: 'KA0120180001234', licenseClass: 'C', licenseExpiry: '2030-05-31', dateOfBirth: '1988-03-14' },
  { firstName: 'Ravi', lastName: 'Menon', email: 'ravi.menon@example.com', phone: '+91 98450 22222', licenseNumber: 'KA0220170005678', licenseClass: 'B', licenseExpiry: '2029-11-30', dateOfBirth: '1991-07-02' },
  { firstName: 'Meera', lastName: 'Iyer', email: 'meera.iyer@example.com', phone: '+91 98450 33333', licenseNumber: 'KA0320150009012', licenseClass: 'D', licenseExpiry: '2025-01-15', dateOfBirth: '1985-12-25' },
  { firstName: 'Karan', lastName: 'Shah', email: 'karan.shah@example.com', phone: '+91 98450 44444', licenseNumber: 'KA0420190003456', licenseClass: 'B', licenseExpiry: '2031-08-20', dateOfBirth: '1995-09-09', status: 'suspended' },
];
