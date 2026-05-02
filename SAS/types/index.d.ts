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
  id: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  userAction: string;
  resetPassword: boolean;
  unlockAccount: boolean;
}

// Profile Types 
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
}


export interface Shipment {
  id: string
  cargowiseId: string          // ← add (was trackingNumber)
  currentStage: ShipmentStatus // ← add (was status)
  originCity: string           // ← add
  originCountryCode: string    // ← add
  destinationCity: string      // ← add
  destinationCountryCode: string // ← add
  carrier: string
  estimatedArrival: Date | null  // ← add
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
  llmCargoPickupDate?: string  // ← add
  runningDateTime?: Date | null // ← add
  noteNumber?: number | null   // ← add
  jsPk?: string                // ← add
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
}


export interface ShipmentMilestone {
  id: string
  shipment_id: string
  name: string
  sequence_order: number
  is_critical: boolean
  status: string
  assigned_to?: string
  due_date?: string | null
  completed_date?: string | null
  notes?: string | null
  location_label?: string | null
  location_lat?: number | null
  location_lng?: number | null
  days_from_booking?: number | null
  created_at: string
}

declare module '*.css'
