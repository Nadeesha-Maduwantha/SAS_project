export type SeverityLevel = "Info" | "Warning" | "Critical";

export interface AuditLog {
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

export interface AuditStats {
  totalEvents: number;
  eventsToday: number;
  criticalChanges: number;
  activeAdmins: number;
}

export interface AuditFilters {
  module: string;
  severity: string;
  dateRange: string;
}
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
  severity: "Info" | "Warning" | "Critical";
}

export interface AuditTrailFilters {
  module: string;
  severity: string;
  dateRange: string;
}

// Renamed from AuditTrailStats to AuditTrailStatsData
export interface AuditTrailStatsData {
  totalEvents: number;
  eventsToday: number;
  criticalChanges: number;
  activeAdmins: number;
}