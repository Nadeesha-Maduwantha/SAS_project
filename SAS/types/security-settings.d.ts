export interface PasswordPolicy {
  minLength: number;
  expiryDays: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: boolean;
}

export interface TwoFactorAuth {
  mode: "optional" | "admin_only" | "all_users";
}

export interface SessionManagement {
  timeoutMinutes: number;
  maxConcurrentSessions: number;
  autoLogoutOnInactivity: boolean;
  requireReauthForSensitive: boolean;
  rememberDevice: boolean;
}

export interface LoginSecurity {
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  enableIPRestrictions: boolean;
  sendSuspiciousAlerts: boolean;
  allowUnrecognizedDevices: boolean;
}

export interface SecurityNotifications {
  notifyFailedAttempts: boolean;
  notifyPasswordChanges: boolean;
  notifyPermissionChanges: boolean;
  notifyNewDeviceLogin: boolean;
  dailySummaryEmail: boolean;
}

export interface SecuritySettings {
  passwordPolicy: PasswordPolicy;
  twoFactorAuth: TwoFactorAuth;
  sessionManagement: SessionManagement;
  loginSecurity: LoginSecurity;
  notifications: SecurityNotifications;
}