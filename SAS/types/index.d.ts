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
}