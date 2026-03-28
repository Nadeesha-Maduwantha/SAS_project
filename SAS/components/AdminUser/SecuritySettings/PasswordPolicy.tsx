import React from "react";
import { PasswordPolicy } from "@/types/security-settings";

interface PasswordPolicyProps {
  data: PasswordPolicy;
  onChange: (data: PasswordPolicy) => void;
}

const PasswordPolicySection: React.FC<PasswordPolicyProps> = ({ data, onChange }) => {
  const handleChange = (key: keyof PasswordPolicy, value: boolean | number) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-800">Password Policy</h2>
          <p className="text-xs text-gray-500">Define password requirements and complexity rules</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Minimum Password Length</label>
          <input
            type="number"
            value={data.minLength}
            onChange={(e) => handleChange("minLength", Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Password Expiry (days)</label>
          <input
            type="number"
            value={data.expiryDays}
            onChange={(e) => handleChange("expiryDays", Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-2">
        {[
          { key: "requireUppercase", label: "Require uppercase letters" },
          { key: "requireLowercase", label: "Require lowercase letters" },
          { key: "requireNumbers",   label: "Require numbers" },
          { key: "requireSpecialChars", label: "Require special characters" },
          { key: "preventReuse",    label: "Prevent password reuse (last 5 passwords)" },
        ].map((item) => (
          <label key={item.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={data[item.key as keyof PasswordPolicy] as boolean}
              onChange={(e) => handleChange(item.key as keyof PasswordPolicy, e.target.checked)}
              className="w-4 h-4 accent-blue-500"
            />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );
};

export default PasswordPolicySection;