import React from "react";
import { SessionManagement } from "@/types/security-settings";

interface SessionManagementProps {
  data: SessionManagement;
  onChange: (data: SessionManagement) => void;
}

const SessionManagementSection: React.FC<SessionManagementProps> = ({ data, onChange }) => {
  const handleChange = (key: keyof SessionManagement, value: boolean | number) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-800">Session Management</h2>
          <p className="text-xs text-gray-500">Control user session duration and behavior</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Session Timeout (minutes)</label>
          <input
            type="number"
            value={data.timeoutMinutes}
            onChange={(e) => handleChange("timeoutMinutes", Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Max Concurrent Sessions</label>
          <input
            type="number"
            value={data.maxConcurrentSessions}
            onChange={(e) => handleChange("maxConcurrentSessions", Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-2">
        {[
          { key: "autoLogoutOnInactivity",      label: "Auto-logout on inactivity" },
          { key: "requireReauthForSensitive",   label: "Require re-authentication for sensitive actions" },
          { key: "rememberDevice",              label: "Remember device for 30 days" },
        ].map((item) => (
          <label key={item.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={data[item.key as keyof SessionManagement] as boolean}
              onChange={(e) => handleChange(item.key as keyof SessionManagement, e.target.checked)}
              className="w-4 h-4 accent-blue-500"
            />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );
};

export default SessionManagementSection;