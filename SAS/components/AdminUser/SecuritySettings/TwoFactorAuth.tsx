import React from "react";
import { TwoFactorAuth } from "@/types/security-settings";

interface TwoFactorAuthProps {
  data: TwoFactorAuth;
  onChange: (data: TwoFactorAuth) => void;
}

const TwoFactorAuthSection: React.FC<TwoFactorAuthProps> = ({ data, onChange }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-green-100 text-green-600 p-2 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-800">Two-Factor Authentication</h2>
          <p className="text-xs text-gray-500">Additional layer of security for user accounts</p>
        </div>
      </div>

      {/* Checkbox */}
      <label
        className={`flex items-start gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${
          data.requireForAdmins
            ? "border-blue-400 bg-blue-50"
            : "border-gray-200 hover:bg-gray-50"
        }`}
      >
        <input
          type="checkbox"
          checked={data.requireForAdmins}
          onChange={(e) => onChange({ requireForAdmins: e.target.checked })}
          className="mt-0.5 accent-blue-500"
          data-testid="checkbox-requireForAdmins"
        />
        <div>
          <p className="text-sm font-medium text-gray-800">Required for admin users</p>
          <p className="text-xs text-gray-500">Mandatory for users with admin privileges</p>
        </div>
      </label>
    </div>
  );
};

export default TwoFactorAuthSection;