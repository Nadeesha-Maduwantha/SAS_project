'use client';

import React, { useState } from 'react';
import BasicInformation from '@/components/AdminUser/BasicInformation';
import AccountManagement from '@/components/AdminUser/AccountManagement';
import { UserFormData } from '@/types';

const EditUserPage: React.FC = () => {
  const [formData, setFormData] = useState<UserFormData>({
    fullName: '',
    email: '',
    department: '',
    role: 'Custom Configuration',
    userAction: '',
    resetPassword: false,
    unlockAccount: false,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = () => {
    console.log('Saving user data:', formData);
    // TODO: connect to your API
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this user?')) {
      console.log('Deleting user...');
      // TODO: connect to your API
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: '',
      email: '',
      department: '',
      role: 'Custom Configuration',
      userAction: '',
      resetPassword: false,
      unlockAccount: false,
    });
  };

  return (
    <div className="min-h-screen bg-slate-200 flex items-center justify-center p-6">
      <div className="bg-slate-100 rounded-2xl p-8 w-full max-w-5xl shadow-md">

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Edit User Profile & Permissions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure user details and granular access controls for the DGL system.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl p-8 grid grid-cols-2 gap-8 mb-6">
          <BasicInformation formData={formData} onChange={handleInputChange} />
          <AccountManagement
            formData={formData}
            onChange={handleInputChange}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400 flex items-center gap-2">
            🕐 Last updated on Oct 24, 2023 by Admin
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              className="px-5 py-2 rounded-lg border border-red-400 text-red-500 text-sm font-medium hover:bg-red-50 transition"
            >
              Delete User
            </button>
            <button
              onClick={handleCancel}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition"
            >
              Save Changes
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EditUserPage;