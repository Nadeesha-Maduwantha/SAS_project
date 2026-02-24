export interface AccessLog {
  id: string;
  timestamp: string;
  user: {
    name: string;
    email: string;
  };
  action: string;
  ipAddress: string;
  location: string;
  device: string;
  status: "Success" | "Failed";
}

export interface AccessLogStats {
  totalLoginsToday: number;
  successfulLogins: number;
  failedAttempts: number;
  activeUsers: number;
}

export interface AccessLogFilters {
  user: string;
  action: string;
  dateRange: string;
}