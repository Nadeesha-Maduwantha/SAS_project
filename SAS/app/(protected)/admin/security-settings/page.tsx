"use client";

import React, { useState, useEffect } from "react";
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
    requireForAdmins: true,
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

const FLASK_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState<SecuritySettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [policyRes, generalRes] = await Promise.all([
          fetch(`${FLASK_API}/api/security-settings/password-policy`, { headers }),
          fetch(`${FLASK_API}/api/security-settings/general`, { headers }),
        ]);
        const [policyJson, generalJson] = await Promise.all([policyRes.json(), generalRes.json()]);

        setSettings((prev) => ({
          ...prev,
          ...(policyRes.ok ? { passwordPolicy: policyJson.data } : {}),
          ...(generalRes.ok ? generalJson.data : {}),
        }));
      } catch {
        // Keep defaults if the backend/settings rows aren't reachable yet.
      } finally {
        // Gates Save (below) so a click before this resolves can't silently
        // write the hardcoded defaultSettings above back over real saved
        // values for whichever fields hadn't loaded yet.
        setLoaded(true);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!loaded) return;
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const [policyRes, generalRes] = await Promise.all([
        fetch(`${FLASK_API}/api/security-settings/password-policy`, {
          method: "PUT",
          headers,
          body: JSON.stringify(settings.passwordPolicy),
        }),
        fetch(`${FLASK_API}/api/security-settings/general`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            twoFactorAuth: settings.twoFactorAuth,
            sessionManagement: settings.sessionManagement,
            loginSecurity: settings.loginSecurity,
            notifications: settings.notifications,
          }),
        }),
      ]);
      const [policyJson, generalJson] = await Promise.all([policyRes.json(), generalRes.json()]);

      if (!policyRes.ok || !generalRes.ok) {
        setError(policyJson.error || generalJson.error || "Failed to save security settings");
        return;
      }

      setSettings((prev) => ({
        ...prev,
        passwordPolicy: policyJson.data,
        ...generalJson.data,
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Could not connect to server. Is Flask running?");
    } finally {
      setSaving(false);
    }
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
            disabled={saving || !loaded}
            data-testid="save-settings-btn"
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              saved ? "bg-green-500" : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {saving ? "Saving..." : saved ? "✓ Saved!" : !loaded ? "Loading…" : "Save Changes"}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg" data-testid="settings-error">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

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