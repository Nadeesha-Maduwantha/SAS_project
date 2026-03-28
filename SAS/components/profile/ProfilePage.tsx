"use client";

import React, { useState } from "react";
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

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile>({
    fullName: "Amal Perera",
    email: "amalperera@dart.com",
    phone: "+94 77 123-4567",
    department: "System Administration",
    role: "Administrator",
    status: "Active",
    verified: true,
    lastLogin: "Today, 09:15 AM",
    memberSince: "Oct 15, 2021",
    profileImage: null,
  });

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
              throw new Error("Function not implemented.");
            } } />
          </div>
        </div>
      </div>
    </div>
  );
}