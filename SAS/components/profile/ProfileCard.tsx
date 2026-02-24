"use client";

import React, { useRef } from "react";
import { UserProfile } from "@/types/profile";
import { Camera, Clock, Calendar } from "lucide-react";
import Image from "next/image";

interface ProfileCardProps {
  user: UserProfile;
  onAvatarChange?: (file: File) => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ user, onAvatarChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAvatarChange) {
      onAvatarChange(file);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "super-user":
        return "Super User";
      case "sales_user":
        return "Sales User";
      case "operation_user":
        return "Operation User";
      default:
        return role;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4">
      {/* Avatar */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.fullName}
              width={96}
              height={96}
              className="object-cover w-full h-full"
            />
          ) : (
            <svg
              className="w-16 h-16 text-gray-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          )}
        </div>
        <button
          onClick={handleAvatarClick}
          className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1.5 cursor-pointer hover:bg-blue-700 transition"
        >
          <Camera className="w-4 h-4 text-white" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Name & Role */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">{user.fullName}</h2>
        <p className="text-sm text-gray-500">{getRoleLabel(user.role)}</p>
      </div>

      {/* Badges */}
      <div className="flex gap-2">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            user.status === "Active"
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-red-600"
          }`}
        >
          {user.status}
        </span>
        {user.isVerified && (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
            Verified
          </span>
        )}
      </div>

      <div className="w-full border-t pt-4 space-y-3">
        {/* Last Login */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
            Last Login
          </p>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{user.lastLogin}</span>
          </div>
        </div>

        {/* Member Since */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
            Member Since
          </p>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{user.memberSince}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;