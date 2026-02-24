/**
 * User Profile Types
 * Type definitions for user profile and related data structures
 */

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  department: string;
  role: "admin" | "super-user" | "sales_user" | "operation_user";
  status: "Active" | "Inactive";
  isVerified: boolean;
  avatarUrl?: string;
  lastLogin?: string;
  createdAt?: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ProfileUpdateData extends Partial<UserProfile> {
  // Partial update fields
}
