import React from 'react';
import { UserFormData } from '@/types';

interface BasicInformationProps {
  formData: UserFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const departments = ['Sales', 'Operations'];
const roles = ['Custom Configuration', 'Admin', 'Super User', 'Operation User','Sales User'];

const BasicInformation: React.FC<BasicInformationProps> = ({ formData, onChange }) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Section Title */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-800">Basic Information</h2>
      </div>

      {/* Full Name */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Full Name</label>
        <input
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={onChange}
          placeholder="e.g. Sarah Jenkins"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400 transition"
        />
      </div>

      {/* Email Address */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Email Address</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">✉</span>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={onChange}
            placeholder="sarah.j@company.com"
            className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400 transition"
          />
        </div>
      </div>

      {/* Department */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Department</label>
        <select
          name="department"
          value={formData.department}
          onChange={onChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400 transition bg-white"
        >
          <option value="">Select Department</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* User Role */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">User Role</label>
        <select
          name="role"
          value={formData.role}
          onChange={onChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400 transition bg-white"
        >
          {roles.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Selecting a preset role will auto-populate permissions on the right.
        </p>
      </div>

      {/* Account Status */}
      <div className="bg-blue-50 rounded-lg p-4 flex gap-3 items-start mt-2">
        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs flex-shrink-0">
          i
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">Account Status</p>
          <p className="text-xs text-gray-500 mt-1">
            This user is currently Active. Last login was 2 hours ago from IP 192.168.1.45.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BasicInformation;