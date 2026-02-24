"use client";

import React, { useState } from "react";
import { UserProfile } from "@/types/profile";
import { User, Mail, Phone, Building2 } from "lucide-react";

interface PersonalInformationProps {
  user: UserProfile;
  onSave: (data: Partial<UserProfile>) => void;
}

const departments = [
  "System Administration",
  "Sales",
  "Operations",
  "IT Support",
];

const PersonalInformation: React.FC<PersonalInformationProps> = ({
  user,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    department: user.department,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCancel = () => {
    setFormData({
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      department: user.department,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <User className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-800">
          Personal Information
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Full Name
            </label>
            <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 focus-within:border-blue-500 transition">
              <User className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="flex-1 outline-none text-sm text-gray-700 bg-transparent"
                placeholder="Full Name"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Email Address
            </label>
            <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 focus-within:border-blue-500 transition">
              <Mail className="w-4 h-4 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="flex-1 outline-none text-sm text-gray-700 bg-transparent"
                placeholder="Email Address"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Phone Number
            </label>
            <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 focus-within:border-blue-500 transition">
              <Phone className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="flex-1 outline-none text-sm text-gray-700 bg-transparent"
                placeholder="Phone Number"
              />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Department
            </label>
            <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 gap-2 focus-within:border-blue-500 transition">
              <Building2 className="w-4 h-4 text-gray-400" />
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="flex-1 outline-none text-sm text-gray-700 bg-transparent"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default PersonalInformation;