"use client";

import React, { useState } from "react";
import ProfileCard from "./ProfileCard";
import PersonalInformation from "./PersonalInformation";
import SecuritySettings from "./SecuritySettings";
import { PasswordChange } from "@/types/profile";

export interface UserProfile {
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

// 1. Define the props interface
export interface ProfilePageProps {
  user: UserProfile;
}

// 2. Accept the user prop in the component
export default function ProfilePage({ user }: ProfilePageProps) {
  // 3. Initialize the state using the passed-in user prop
  const [userProfile, setUserProfile] = useState<UserProfile>(user);

  const handleProfileUpdate = (updatedData: Partial<UserProfile>) => {
    setUserProfile((prev) => ({
      ...prev,
      ...updatedData,
    }));
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
            <ProfileCard profile={userProfile} />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <PersonalInformation 
              profile={userProfile} 
              onUpdate={handleProfileUpdate} 
            />
            <SecuritySettings onChangePassword={function (data: PasswordChange): void {
              // Now you can implement actual password logic when needed
              console.log("Password change requested", data);
            } } />
          </div>
        </div>
      </div>
    </div>
  );
}