import React from "react";
import { LoginSecurity } from "@/types/security-settings";

interface LoginSecurityProps {
  data: LoginSecurity;
  onChange: (data: LoginSecurity) => void;
}

const LoginSecuritySection: React.FC<LoginSecurityProps> = ({ data, onChange }) => {
  const handleChange = (key: keyof LoginSecurity, value: boolean | number) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-red-100 text-red-500 p-2 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-800">Login Security</h2>
          <p className="text-xs text-gray-500">Protect against unauthorized access attempts</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Max Failed Login Attempts</label>
          <input
            type="number"
            value={data.maxFailedAttempts}
            onChange={(e) => handleChange("maxFailedAttempts", Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Account Lockout Duration (minutes)</label>
          <input
            type="number"
            value={data.lockoutDurationMinutes}
            onChange={(e) => handleChange("lockoutDurationMinutes", Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-2">
        {[
          { key: "enableIPRestrictions",    label: "Enable IP-based access restrictions" },
          { key: "sendSuspiciousAlerts",    label: "Send email alerts for suspicious login attempts" },
          { key: "allowUnrecognizedDevices",label: "Allow login from unrecognized devices" },
        ].map((item) => (
          <label key={item.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={data[item.key as keyof LoginSecurity] as boolean}
              onChange={(e) => handleChange(item.key as keyof LoginSecurity, e.target.checked)}
              className="w-4 h-4 accent-blue-500"
            />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );
};

export default LoginSecuritySection;