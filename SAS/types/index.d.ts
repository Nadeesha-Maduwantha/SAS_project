// ─── Shipment Types ───────────────────────────────────────────
export type ShipmentStatus =
  | 'in_transit'
  | 'customs_hold'
  | 'arrived_at_port'
  | 'processing'
  | 'delivered'
  | 'port_congestion'
  | 'weather_delay'
  | 'equipment_issue'
  | 'documentation_issue'
  | 'vessel_delay'

export interface CargowiseUser {
  staffCode: string
  name: string
  email: string
}

export interface Shipment {
  id: string
  cargowiseId: string
  originCity: string
  originCountryCode: string
  destinationCity: string
  destinationCountryCode: string
  currentStage: ShipmentStatus
  carrier: string
  estimatedArrival: Date | null
  createdBy: CargowiseUser
  lastUpdatedBy: CargowiseUser
  createdAt: Date
  updatedAt: Date
  isPriority?: boolean
  delayReason?: string
  delayDays?: number
  deliveryDate?: Date
  archivedDate?: Date
  transitDays?: number
<<<<<<< HEAD
jobNumber?: string
houseBillNumber?: string
transportMode?: string
branch?: string
gbCode?: string
gcCode?: string
stDescription?: string
stNoteText?: string
cargoReadyDate?: Date
cargoReceivedDate?: Date
cargoPickupDate?: Date
pickupDateStatus?: string
jobLastEditTime?: Date
llmIdentifiedType?: string
llmNote?: string
shipperName?: string
shipperAddress?: string
shipperContact?: string
shipperPhone?: string
consigneeName?: string
consigneeAddress?: string
consigneeContact?: string
consigneeEmail?: string
<<<<<<< HEAD

=======
salesUserStaffCode?: string
salesUserName?: string
salesUserEmail?: string
>>>>>>> 99762374183279ee8046687e9690d09ac424354d
=======
  jobNumber?: string
  houseBillNumber?: string
  transportMode?: string
  branch?: string
  gbCode?: string
  gcCode?: string
  stDescription?: string
  stNoteText?: string
  cargoReadyDate?: Date
  cargoReceivedDate?: Date
  cargoPickupDate?: Date
  pickupDateStatus?: string
  jobLastEditTime?: Date
  llmIdentifiedType?: string
  llmNote?: string
  shipperName?: string
  shipperAddress?: string
  shipperContact?: string
  shipperPhone?: string
  consigneeName?: string
  consigneeAddress?: string
  consigneeContact?: string
  consigneeEmail?: string
  salesUserStaffCode?: string
  salesUserName?: string
  salesUserEmail?: string
  jsPk?: string
  llmCargoPickupDate?: string
  runningDateTime?: Date | null
  noteNumber?: number | null
>>>>>>> 21f793f1dab44f11c2278ee83fb129acbd8148ce
}

export interface ShipmentStats {
  total: number
  inTransit: number
  exceptions: number
  deliveredToday: number
}

export interface DelayedStats {
  totalDelayed: number
  highPriority: number
  avgDelayDays: number
  customsIssues: number
<<<<<<< HEAD

=======
>>>>>>> 21f793f1dab44f11c2278ee83fb129acbd8148ce
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  status: 'Active' | 'Blocked' | 'Locked';
  lastLogin: string;
  lastLoginIP: string;
  lastUpdated: string;
  lastUpdatedBy: string;
}

export interface UserFormData {
  fullName: string;
  email: string;
  department: string;
  role: string;
  userAction: 'block' | 'unblock' | '';
  resetPassword: boolean;
  unlockAccount: boolean;
}

// ─── Profile Types ───────────────────────────────────────────
<<<<<<< HEAD

=======
>>>>>>> 21f793f1dab44f11c2278ee83fb129acbd8148ce
export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  department: string;
  role: "admin" | "super-user" | "sales_user" | "operation_user";
  status: "Active" | "Inactive";
  isVerified: boolean;
  lastLogin: string;
  memberSince: string;
  avatarUrl?: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
<<<<<<< HEAD
}
=======
}

declare module '*.css'
>>>>>>> 21f793f1dab44f11c2278ee83fb129acbd8148ce
