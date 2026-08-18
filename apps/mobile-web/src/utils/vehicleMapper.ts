import { Vehicle } from '../types/vehicle';

export function mapApiVehicle(v: any, isGuest = false): Vehicle {
  return {
    id: v.id ? v.id.toString() : '',
    registrationNumber: v.registration_number ?? v.registrationNumber ?? '',
    make: v.make || '',
    model: v.model || '',
    colour: v.colour || '',
    motStatus: v.motStatus ?? v.mot_status ?? 'Unknown',
    motDueDate: v.motDueDate ?? v.motExpiryDate ?? v.mot_due_date,
    taxStatus: v.taxStatus ?? v.tax_status ?? 'Unknown',
    taxDueDate: v.taxDueDate ?? v.tax_due_date,
    isVerified: v.is_v5_verified ?? v.isVerified ?? false,
    v5_status: v.v5_status ?? 'UNVERIFIED',
    isGuest,
  };
}
