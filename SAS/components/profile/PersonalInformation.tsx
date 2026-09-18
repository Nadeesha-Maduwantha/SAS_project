"use client";

import React, { useState, useEffect } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { validateFullName, validatePhoneNumber } from "@/lib/profileValidation";

interface PersonalInformationProps {
  profile: {
    fullName: string;
    email: string;
    phone: string;
    department: string;
  };
  onUpdate: (updatedData: any) => Promise<void>; // Make this async
}

export default function PersonalInformation({ 
  profile, 
  onUpdate 
}: PersonalInformationProps) {
  const [formData, setFormData] = useState({
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    department: profile.department,
  });

  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; phone?: string }>({});

  // THIS IS THE FIX: Update the form when the database data arrives
  useEffect(() => {
    setFormData({
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      department: profile.department,
    });
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setIsModified(true);
  };

  const handlePhoneChange = (value?: string) => {
    setFormData((prev) => ({ ...prev, phone: value || "" }));
    setFieldErrors((prev) => ({ ...prev, phone: undefined }));
    setIsModified(true);
  };

  const handleSave = async () => {
    // Only validate (and send) fields the user actually changed. Accounts
    // with a phone number saved before this validation existed may have a
    // value that wouldn't pass it (e.g. a bare local number with no country
    // code) — that shouldn't block saving an unrelated field like the name,
    // and shouldn't force a re-entry of data the user never touched.
    const nameChanged = formData.fullName !== profile.fullName;
    const phoneChanged = formData.phone !== profile.phone;

    const nameError = nameChanged ? validateFullName(formData.fullName) : null;
    const phoneError = phoneChanged ? validatePhoneNumber(formData.phone) : null;
    if (nameError || phoneError) {
      setFieldErrors({ fullName: nameError ?? undefined, phone: phoneError ?? undefined });
      return;
    }
    setFieldErrors({});

    setIsSaving(true);
    try {
      const editableData: { fullName?: string; phone?: string } = {};
      if (nameChanged) editableData.fullName = formData.fullName;
      if (phoneChanged) editableData.phone = formData.phone;
      await onUpdate(editableData); // Wait for the backend update
      setIsModified(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      department: profile.department,
    });
    setFieldErrors({});
    setIsModified(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5 text-blue-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
          />
        </svg>
        <h2 className="text-lg font-semibold text-gray-800">
          Personal Information
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            maxLength={100}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-full ${
              fieldErrors.fullName ? "border-red-400" : "border-gray-300"
            }`}
          />
          {fieldErrors.fullName && (
            <p className="text-sm text-red-500 mt-1">{fieldErrors.fullName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address (Read Only)
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            disabled
            className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed max-w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <PhoneInput
            international
            // react-phone-number-input requires `value` to already be a
            // valid E.164 string. A pre-existing number saved before this
            // validation existed (e.g. a bare local number) isn't, and would
            // crash the component — show it as unset instead until the user
            // enters a properly-formatted one.
            value={formData.phone?.startsWith('+') ? formData.phone : undefined}
            onChange={handlePhoneChange}
            className={`w-full px-3 py-2 border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 max-w-full ${
              fieldErrors.phone ? "border-red-400" : "border-gray-300"
            }`}
            numberInputProps={{ className: "outline-none bg-transparent flex-1 min-w-0" }}
          />
          {fieldErrors.phone && (
            <p className="text-sm text-red-500 mt-1">{fieldErrors.phone}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Department (Read Only)
          </label>
          <input
            type="text"
            name="department"
            value={formData.department}
            disabled
            className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed max-w-full"
          />
        </div>
      </div>

      {isModified && (
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}