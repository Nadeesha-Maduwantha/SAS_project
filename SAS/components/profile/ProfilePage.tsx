"use client";

import React from "react";
import { UserProfile, PasswordChange } from "@/types/profile";
import ProfileCard from "./ProfileCard";
import PersonalInformation from "./PersonalInformation";
import SecuritySettings from "./SecuritySettings";

interface ProfilePageProps {
  user: UserProfile;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user }) => {
  const handleSavePersonalInfo = (data: Partial<UserProfile>) => {
    console.log("Saving personal info:", data);
    // TODO: API call to save personal information
  };

  const handleChangePassword = (data: PasswordChange) => {
    console.log("Changing password:", data);
    // TODO: API call to change password
  };

  const handleAvatarChange = (file: File) => {
    console.log("Changing avatar:", file);
    // TODO: API call to upload avatar
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
          <p className="text-sm text-gray-500">
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Profile Card */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <ProfileCard user={user} onAvatarChange={handleAvatarChange} />
          </div>

          {/* Right: Forms */}
          <div className="flex-1 flex flex-col gap-6">
            <PersonalInformation user={user} onSave={handleSavePersonalInfo} />
            <SecuritySettings onChangePassword={handleChangePassword} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;