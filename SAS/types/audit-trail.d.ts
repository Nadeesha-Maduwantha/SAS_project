export type SeverityLevel = "Info" | "Warning" | "Critical";

export interface AuditTrailEvent {
  id: string;
  timestamp: string;
  user: {
    name: string;
    role: string;
  };
  module: string;
  action: string;
  details: string;
  severity: SeverityLevel;
}

export interface AuditTrailFilters {
  module: string;
  severity: SeverityLevel | "all" | string; // Allowing string fallback if 'all' or other values are used in UI state
  dateRange: string;
}

export interface AuditTrailStatsData {
  totalEvents: number;
  eventsToday: number;
  criticalChanges: number;
  activeAdmins: number;
}