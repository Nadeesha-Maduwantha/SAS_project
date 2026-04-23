"use client";

import React, { useState } from "react";
import { LockKeyhole, Eye, EyeOff, Info } from "lucide-react";
import { PasswordChange } from "@/types/profile";

interface SecuritySettingsProps {
  onChangePassword: (data: PasswordChange) => void;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  onChangePassword,
}) => {
  const [formData, setFormData] = useState<PasswordChange>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [errors, setErrors] = useState<Partial<PasswordChange>>({});

  const toggleShow = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const validate = () => {
    const newErrors: Partial<PasswordChange> = {};
    if (!formData.currentPassword)
      newErrors.currentPassword = "Current password is required";
    if (!formData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(formData.newPassword)) {
      newErrors.newPassword = "Must contain at least one uppercase character";
    } else if (!/[0-9!@#$%^&*]/.test(formData.newPassword)) {
      newErrors.newPassword = "Must contain at least one number or special character";
    }
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onChangePassword(formData);
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    }
  };

  const PasswordInput = ({
    label,
    name,
    value,
    showKey,
    error,
  }: {
    label: string;
    name: keyof PasswordChange;
    value: string;
    showKey: "current" | "new" | "confirm";
    error?: string;
  }) => (
    <div>
      <label className="block text-sm text-gray-500 mb-1">{label}</label>
      <div
        className={`flex items-center border rounded-lg px-3 py-2 gap-2 focus-within:border-blue-500 transition ${
          error ? "border-red-400" : "border-gray-200"
        }`}
      >
        <LockKeyhole className="w-4 h-4 text-gray-400" />
        <input
          type={showPasswords[showKey] ? "text" : "password"}
          name={name}
          value={value}
          onChange={handleChange}
          className="flex-1 outline-none text-sm text-gray-700 bg-transparent"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => toggleShow(showKey)}
          className="text-gray-400 hover:text-gray-600"
        >
          {showPasswords[showKey] ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <LockKeyhole className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-800">
          Security Settings
        </h2>
      </div>

      {/* Password Requirements */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-600">
            Password Requirements
          </span>
        </div>
        <ul className="text-xs text-blue-500 space-y-1 list-disc list-inside">
          <li>Minimum 8 characters long</li>
          <li>At least one uppercase character</li>
          <li>At least one number or special character</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Password */}
        <PasswordInput
          label="Current Password"
          name="currentPassword"
          value={formData.currentPassword}
          showKey="current"
          error={errors.currentPassword}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* New Password */}
          <PasswordInput
            label="New Password"
            name="newPassword"
            value={formData.newPassword}
            showKey="new"
            error={errors.newPassword}
          />

          {/* Confirm Password */}
          <PasswordInput
            label="Confirm New Password"
            name="confirmPassword"
            value={formData.confirmPassword}
            showKey="confirm"
            error={errors.confirmPassword}
          />
        </div>

        <div className="flex justify-end mt-4">
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition"
          >
            Change Password
          </button>
        </div>
      </form>
    </div>
  );
};

export default SecuritySettings;