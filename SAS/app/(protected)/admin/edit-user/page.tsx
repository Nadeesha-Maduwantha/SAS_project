'use client';

import React, { useState } from 'react';
import BasicInformation from '@/components/AdminUser/BasicInformation';
import AccountManagement from '@/components/AdminUser/AccountManagement';
import { UserFormData } from '@/types';
import AdminTopBar from '@/components/AdminUser/AdminTopBar';
import AdminLeftNavBar from '@/components/AdminUser/AdminLeftNavBar';
import AppDialog, { AppDialogState } from '@/components/shared/AppDialog';

const EditUserPage: React.FC = () => {
  // --- New state for search ---
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialog, setDialog] = useState<AppDialogState | null>(null);

  const [formData, setFormData] = useState<UserFormData & { id?: string }>({
    id: '',
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
      const token = localStorage.getItem('access_token');
      
      // Connects to your Python Flask backend
      const response = await fetch(`http://127.0.0.1:5000/api/users/search?email=${encodeURIComponent(searchEmail)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
        setSearchError('');
      } else {
        // Usually a 404 Not Found error
        setSearchError(data.error || 'User not found. Please check the email.');
        setFormData({
          id: '',
          fullName: '',
          email: '',
          department: '',
          role: 'Custom Configuration',
          userAction: '',
          resetPassword: false,
          unlockAccount: false,
        });
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

  const handleSave = async () => {
    if (!formData.id) {
      setDialog({ variant: 'error', title: 'No user selected', message: 'Please search and select a user first.' });
      return;
    }

    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(`http://localhost:5000/api/users/${formData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          department: formData.department,
          role: formData.role,
          email: formData.email,
          userAction: formData.userAction,
          unlockAccount: formData.unlockAccount
        })
      });

      const data = await response.json();

      if (response.ok) {
        setDialog({ variant: 'success', title: 'User updated', message: 'User updated successfully.' });
      } else {
        setDialog({ variant: 'error', title: 'Update failed', message: data.error || 'Failed to save user.' });
      }
    } catch (error) {
      console.error('Save error:', error);
      setDialog({
        variant: 'error',
        title: 'Network error',
        message: error instanceof Error ? error.message : 'Failed to save user.',
      });
    }
  };

  const performDelete = async () => {
    setDialog(null);
    setIsDeleting(true);

    try {
      const token = localStorage.getItem('access_token');

      if (!token) {
        setDialog({ variant: 'error', title: 'Not authenticated', message: 'Please log in again.' });
        setIsDeleting(false);
        return;
      }

      const response = await fetch(`http://127.0.0.1:5000/api/users/${formData.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setDialog({ variant: 'success', title: 'User deleted', message: `User "${formData.email}" deleted successfully.` });
        // Reset form after successful deletion
        setFormData({
          id: '',
          fullName: '',
          email: '',
          department: '',
          role: 'Custom Configuration',
          userAction: '',
          resetPassword: false,
          unlockAccount: false,
        });
        setSearchEmail('');
        setSearchError('');
      } else {
        // Handle specific error responses
        const errorMessage = data.details || data.error || 'Failed to delete user';

        if (response.status === 401) {
          setDialog({ variant: 'error', title: 'Unauthorized', message: `${errorMessage}\nPlease log in again.` });
        } else if (response.status === 403) {
          setDialog({ variant: 'error', title: 'Permission denied', message: `${errorMessage}\n\nOnly Admin users can delete other users.` });
        } else if (response.status === 404) {
          setDialog({ variant: 'error', title: 'User not found', message: errorMessage });
        } else {
          setDialog({ variant: 'error', title: 'Delete failed', message: errorMessage });
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
      setDialog({
        variant: 'error',
        title: 'Network error',
        message: error instanceof Error ? error.message : 'Failed to delete user.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = () => {
    if (!formData.id || !formData.email) {
      setDialog({ variant: 'error', title: 'No user selected', message: 'Please search and select a user first.' });
      return;
    }

    setDialog({
      variant: 'confirm',
      title: 'Delete user?',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: performDelete,
    });
  };

  const handleCancel = () => {
    setFormData({
      id: '',
      fullName: '',
      email: '',
      department: '',
      role: 'Custom Configuration',
      userAction: '',
      resetPassword: false,
      unlockAccount: false,
    });
    setSearchEmail('');
    setSearchError('');
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

        {/* Search Section */}
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

        {/* Search Error Feedback */}
        {searchError && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
            ️ {searchError}
          </div>
        )}

        {/* Main Card - Only show if user is found */}
        {formData.id && (
          <div className="bg-white rounded-xl p-8 grid grid-cols-2 gap-8 mb-6">
            <BasicInformation formData={formData} onChange={handleInputChange} />
            <AccountManagement
              formData={formData}
              onChange={handleInputChange}
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end">
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={!formData.id || isDeleting}
              className={`px-5 py-2 rounded-lg border text-sm font-medium transition ${
                !formData.id || isDeleting
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-red-400 text-red-500 hover:bg-red-50'
              }`}
            >
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </button>
            <button
              onClick={handleCancel}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.id}
              className={`px-5 py-2 rounded-lg text-white text-sm font-medium transition ${
                !formData.id
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              Save Changes
            </button>
          </div>
        </div>

      </div>

      <AppDialog dialog={dialog} onClose={() => setDialog(null)} />
    </div>
  );
};

export default EditUserPage;