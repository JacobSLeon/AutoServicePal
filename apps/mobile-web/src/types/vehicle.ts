export interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  colour: string;
  motStatus: string;
  motDueDate?: string;
  taxStatus: string;
  taxDueDate?: string;
  isVerified: boolean;
  v5_status: 'UNVERIFIED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  isGuest: boolean;
}
