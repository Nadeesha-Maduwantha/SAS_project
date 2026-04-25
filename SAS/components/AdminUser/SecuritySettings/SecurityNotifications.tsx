import React from "react";
import { SecurityNotifications } from "@/types/security-settings";

interface SecurityNotificationsProps {
  data: SecurityNotifications;
  onChange: (data: SecurityNotifications) => void;
}

const SecurityNotificationsSection: React.FC<SecurityNotificationsProps> = ({ data, onChange }) => {
  const handleChange = (key: keyof SecurityNotifications, value: boolean) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-blue-100 text-blue-500 p-2 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-800">Security Notifications</h2>
          <p className="text-xs text-gray-500">Alert preferences for security events</p>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-2">
        {[
          { key: "notifyFailedAttempts",    label: "Notify on failed login attempts" },
          { key: "notifyPasswordChanges",   label: "Notify on password changes" },
          { key: "notifyPermissionChanges", label: "Notify on permission changes" },
          { key: "notifyNewDeviceLogin",    label: "Notify on new device login" },
          { key: "dailySummaryEmail",       label: "Daily security summary email" },
        ].map((item) => (
          <label key={item.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={data[item.key as keyof SecurityNotifications]}
              onChange={(e) => handleChange(item.key as keyof SecurityNotifications, e.target.checked)}
              className="w-4 h-4 accent-blue-500"
            />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );
};

export default SecurityNotificationsSection;