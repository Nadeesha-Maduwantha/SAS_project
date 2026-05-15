"use client";

import React, { useState, useEffect } from "react";
import ProfileCard from "./ProfileCard";
import PersonalInformation from "./PersonalInformation";
import SecuritySettings from "./SecuritySettings";
import { PasswordChange } from "@/types/profile";

interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  status: string;
  verified: boolean;
  lastLogin: string;
  memberSince: string;
  profileImage: string | null;
}

interface ProfilePageProps {
  user?: any; // The user data passed down from your backend via page.tsx
}

export default function ProfilePage({ user }: ProfilePageProps) {
  // Initial state right before the backend data loads
  const [userProfile, setUserProfile] = useState<UserProfile>({
    fullName: "Loading...",
    email: "Loading...",
    phone: "Loading...",
    department: "Loading...",
    role: "User",
    status: "Active",
    verified: true,
    lastLogin: "Today",
    memberSince: "Recently",
    profileImage: null,
  });

  // When the real 'user' data comes in from the API, update ALL the fields!
  useEffect(() => {
    if (user) {
      setUserProfile((prev) => ({
        ...prev,
        fullName: user.fullName || prev.fullName,
        email: user.email || prev.email,
        phone: user.phoneNumber || prev.phone,
        department: user.department || prev.department,
        role: user.role || prev.role,
        status: user.status || prev.status,
        verified: user.isVerified !== undefined ? user.isVerified : prev.verified,
        lastLogin: user.lastLogin || prev.lastLogin,
        memberSince: user.memberSince || prev.memberSince,
        profileImage: user.avatarUrl || prev.profileImage,
      }));
    }
  }, [user]);

  const handleProfileUpdate = async (updatedData: Partial<UserProfile>) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5000/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: updatedData.fullName,
          phone_number: updatedData.phone
        }),
      });

      if (!response.ok) throw new Error('Failed to update');

      setUserProfile((prev) => ({
        ...prev,
        ...updatedData,
      }));
      alert("Profile updated successfully!");
    } catch (error) {
      console.error(error);
      throw error; // Rethrow to let PersonalInformation know it failed
    }
  };

  const handlePasswordChange = async (data: PasswordChange) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5000/api/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          new_password: data.newPassword
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed: ${errorData.error}`);
        return;
      }

      alert("Password changed successfully! Please log in again.");
      localStorage.removeItem('access_token');
      window.location.href = '/';
    } catch (error) {
      console.error(error);
      alert("Failed to change password.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account settings and preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            {/* The left card will now show the correct email, status, and dates */}
            <ProfileCard profile={userProfile} />
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* The right form will now populate with the correct email, phone, and department */}
            <PersonalInformation 
              profile={userProfile} 
              onUpdate={handleProfileUpdate} 
            />
            <SecuritySettings onChangePassword={handlePasswordChange} />
          </div>
        </div>
      </div>
    </div>
  );
}