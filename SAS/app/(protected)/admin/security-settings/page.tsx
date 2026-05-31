"use client";

import React, { useState } from "react";
import { SecuritySettings } from "@/types/security-settings";
import PasswordPolicySection from "@/components/AdminUser/SecuritySettings/PasswordPolicy";
import TwoFactorAuthSection from "@/components/AdminUser/SecuritySettings/TwoFactorAuth";
import SessionManagementSection from "@/components/AdminUser/SecuritySettings/SessionManagement";
import LoginSecuritySection from "@/components/AdminUser/SecuritySettings/LoginSecurity";
import AdminLeftNavBar from '@/components/AdminUser/AdminLeftNavBar';
import SecurityNotificationsSection from "@/components/AdminUser/SecuritySettings/SecurityNotifications";

// ─── Default Data ─────────────────────────────────────────────────────────────
const defaultSettings: SecuritySettings = {
  passwordPolicy: {
    minLength: 12,
    expiryDays: 90,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventReuse: true,
  },
  twoFactorAuth: {
    mode: "optional",
  },
  sessionManagement: {
    timeoutMinutes: 60,
    maxConcurrentSessions: 3,
    autoLogoutOnInactivity: true,
    requireReauthForSensitive: true,
    rememberDevice: true,
  },
  loginSecurity: {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
    enableIPRestrictions: true,
    sendSuspiciousAlerts: true,
    allowUnrecognizedDevices: true,
  },
  notifications: {
    notifyFailedAttempts: true,
    notifyPasswordChanges: true,
    notifyPermissionChanges: true,
    notifyNewDeviceLogin: true,
    dailySummaryEmail: true,
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState<SecuritySettings>(defaultSettings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    console.log("Saving settings:", settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Security Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure system-wide security policies and authentication requirements.
            </p>
          </div>
          <button
            onClick={handleSave}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
              saved ? "bg-green-500" : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {saved ? "✓ Saved!" : "Save Changes"}
          </button>
        </div>

        {/* Sections */}
        <PasswordPolicySection
          data={settings.passwordPolicy}
          onChange={(data) => setSettings({ ...settings, passwordPolicy: data })}
        />
        <TwoFactorAuthSection
          data={settings.twoFactorAuth}
          onChange={(data) => setSettings({ ...settings, twoFactorAuth: data })}
        />
        <SessionManagementSection
          data={settings.sessionManagement}
          onChange={(data) => setSettings({ ...settings, sessionManagement: data })}
        />
        <LoginSecuritySection
          data={settings.loginSecurity}
          onChange={(data) => setSettings({ ...settings, loginSecurity: data })}
        />
        <SecurityNotificationsSection
          data={settings.notifications}
          onChange={(data) => setSettings({ ...settings, notifications: data })}
        />

      </div>
    </div>
  );
}