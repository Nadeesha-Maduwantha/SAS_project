import React from 'react';
import { UserFormData } from '@/types';

interface AccountManagementProps {
  formData: UserFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const AccountManagement: React.FC<AccountManagementProps> = ({ formData, onChange }) => {
  return (
    <div className="flex flex-col gap-4 pl-8 border-l border-gray-100">
      {/* Section Header */}
      <div className="flex items-center mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1a5 5 0 00-5 5v2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V10a2 2 0 00-2-2h-2V6a5 5 0 00-5-5zm0 2a3 3 0 013 3v2H9V6a3 3 0 013-3zm0 9a2 2 0 110 4 2 2 0 010-4z"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-800">Account Management</h2>
        </div>
      </div>

      {/* User Actions */}
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">User Actions</p>

      {/* Block User */}
      <label className="border border-gray-200 rounded-lg p-4 flex gap-3 items-start cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
        <input
          type="radio"
          name="userAction"
          value="block"
          checked={formData.userAction === 'block'}
          onChange={onChange}
          className="mt-1 accent-blue-500"
        />
        <div>
          <p className="text-sm font-semibold text-gray-800">Block User</p>
          <p className="text-xs text-gray-400 mt-1">Prevent user from accessing the system and logging in.</p>
        </div>
      </label>

      {/* Unblock User */}
      <label className="border border-gray-200 rounded-lg p-4 flex gap-3 items-start cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
        <input
          type="radio"
          name="userAction"
          value="unblock"
          checked={formData.userAction === 'unblock'}
          onChange={onChange}
          className="mt-1 accent-blue-500"
        />
        <div>
          <p className="text-sm font-semibold text-gray-800">Unblock User</p>
          <p className="text-xs text-gray-400 mt-1">Restore user access and allow login to the system.</p>
        </div>
      </label>

      {/* Security & Access */}
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Security & Access</p>

      <div className="grid grid-cols-2 gap-3">
        {/* Reset Password */}
        <label className="border border-gray-200 rounded-lg p-4 flex gap-3 items-start cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
          <input
            type="checkbox"
            name="resetPassword"
            checked={formData.resetPassword}
            onChange={onChange}
            className="mt-1 accent-blue-500"
          />
          <div>
            <p className="text-sm font-semibold text-gray-800">Reset Password</p>
            <p className="text-xs text-gray-400 mt-1">Send password reset link to user's email address.</p>
          </div>
        </label>

        {/* Unlock Account */}
        <label className="border border-gray-200 rounded-lg p-4 flex gap-3 items-start cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
          <input
            type="checkbox"
            name="unlockAccount"
            checked={formData.unlockAccount}
            onChange={onChange}
            className="mt-1 accent-blue-500"
          />
          <div>
            <p className="text-sm font-semibold text-gray-800">Unlock Account</p>
            <p className="text-xs text-gray-400 mt-1">Remove account lock due to failed login attempts.</p>
          </div>
        </label>
      </div>
    </div>
  );
};

export default AccountManagement;