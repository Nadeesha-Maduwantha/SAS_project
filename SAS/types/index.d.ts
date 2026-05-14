// ─── Shipment Status ─────────────────────────────────────────────────────────
// FIXED: values now match what CargoWise actually returns via the Flask API.
// Previously used internal enum values (e.g. 'in_transit') that never
// appeared in real data — every status badge was rendering as gray "Unknown".
export type ShipmentStatus =
  | 'Booking Approval'
  | 'Shipment Approval'
  | 'Delivery Date'
  | 'Delivered to CFS'
  | 'Import Delivery Instructions'
  | 'Delivered'
  | 'Delayed'
  | string // allow unknown future CargoWise stages without breaking the app

// ─── Transport Mode ───────────────────────────────────────────────────────────
export type TransportMode = 'AIR' | 'SEA' | 'ROAD'

// ─── Pickup Date Status ───────────────────────────────────────────────────────
export type PickupDateStatus = 'Future' | 'Delayed' | 'Past' | 'Today'

// ─── CargoWise User ───────────────────────────────────────────────────────────
export interface CargowiseUser {
  staffCode: string
  name: string
  email: string
}

// ─── Shipment ─────────────────────────────────────────────────────────────────
export interface Shipment {
  id: string
  cargowiseId: string
  // currentStage holds the raw CargoWise DB value.
  // llmIdentifiedType is the human-readable stage from LLM classification.
  // Use llmIdentifiedType as the display value; currentStage as fallback.
  currentStage: ShipmentStatus
  llmIdentifiedType?: string
  llmNote?: string
  llmCargoPickupDate?: string
  originCity: string
  originCountryCode: string
  destinationCity: string
  destinationCountryCode: string
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
  jobNumber?: string
  houseBillNumber?: string
  transportMode?: TransportMode | string
  branch?: string
  gbCode?: string
  gcCode?: string
  stDescription?: string
  stNoteText?: string
  cargoReadyDate?: Date
  cargoReceivedDate?: Date
  cargoPickupDate?: Date
  pickupDateStatus?: PickupDateStatus | string
  jobLastEditTime?: Date
  runningDateTime?: Date | null
  noteNumber?: number | null
  jsPk?: string
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

// ─── Shipment Stats ───────────────────────────────────────────────────────────
export interface ShipmentStats {
  total: number
  pending: number
  delivered: number
  delayed: number
}

export interface DelayedStats {
  totalDelayed: number
  highPriority: number
  avgDelayDays: number
  customsIssues: number
}

export interface DepartmentStats {
  onTime: number
  delayed: number
  atRisk: number
  deliveredToday: number
}

// ─── Shipment Milestone ───────────────────────────────────────────────────────
// NOT CHANGED — belongs to the milestone module (teammate's work).
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

// ─── User Types ───────────────────────────────────────────────────────────────
export interface User {
  id: string
  fullName: string
  email: string
  department: string
  role: string
  status: 'Active' | 'Blocked' | 'Locked'
  lastLogin: string
  lastLoginIP: string
  lastUpdated: string
  lastUpdatedBy: string
}

export interface UserFormData {
  fullName: string
  email: string
  department: string
  role: string
  userAction: 'block' | 'unblock' | ''
  resetPassword: boolean
  unlockAccount: boolean
}

// ─── Profile Types ────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string
  fullName: string
  email: string
  phoneNumber: string
  department: string
  role: 'admin' | 'super-user' | 'sales_user' | 'operation_user'
  status: 'Active' | 'Inactive'
  isVerified: boolean
  lastLogin: string
  memberSince: string
  avatarUrl?: string
}

export interface PasswordChange {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

declare module '*.css'