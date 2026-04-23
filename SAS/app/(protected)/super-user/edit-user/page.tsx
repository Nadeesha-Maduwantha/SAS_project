'use client';

import React, { useState } from 'react';
import BasicInformation from '@/components/AdminUser/BasicInformation';
import AccountManagement from '@/components/AdminUser/AccountManagement';
import { UserFormData } from '@/types';

const EditUserPage: React.FC = () => {
  // --- New state for search ---
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [formData, setFormData] = useState<UserFormData & { id?: string }>({
    fullName: '',
    email: '',
    department: '',
    role: 'Custom Configuration',
    userAction: '',
    resetPassword: false,
    unlockAccount: false,
  });

  // --- Real Backend Search Handler ---
  const handleSearch = async () => {
    if (!searchEmail) return;
    
    setIsSearching(true);
    setSearchError('');
    console.log('Searching for user with email:', searchEmail);
    
    try {
      // Connects to your Python Flask backend
      const response = await fetch(`http://localhost:5000/api/users/search?email=${encodeURIComponent(searchEmail)}`);
      const data = await response.json();
      
      if (response.ok && data.user) {
        // Populate the form fields with the data found in Supabase
        setFormData({
          id: data.user.id,
          fullName: data.user.fullName || '',
          email: data.user.email || '',
          department: data.user.department || '',
          role: data.user.role || 'Custom Configuration',
          userAction: '',
          resetPassword: false,
          unlockAccount: false,
        });
      } else {
        // Usually a 404 Not Found error
        setSearchError(data.error || 'User not found. Please check the email.');
      }
    } catch (error) {
      console.error('Failed to search user:', error);
      setSearchError('Connection failed. Please ensure the backend is running.');
    } finally {
      setIsSearching(false);
    }
  };

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
    setSearchEmail(''); // clear search as well
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

        {/* NEW: Search Section */}
        <div className="mb-6 bg-white p-5 rounded-xl shadow-sm flex items-center gap-4 border border-gray-100">
          <label htmlFor="searchEmail" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
            Find User
          </label>
          <input
            type="email"
            id="searchEmail"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter user email address..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchEmail}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isSearching || !searchEmail 
                ? 'bg-blue-300 cursor-not-allowed text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
            }`}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* NEW: Search Error Feedback */}
        {searchError && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
            {searchError}
          </div>
        )}

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