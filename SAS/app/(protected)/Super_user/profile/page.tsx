import ProfilePage from "@/components/profile/ProfilePage";
import { UserProfile } from "@/types/profile";

const mockSuperUser: UserProfile = {
  id: "2",
  fullName: "Super User",
  email: "superuser@dart.com",
  phoneNumber: "+94 77 234-5678",
  department: "IT Support",
  role: "super-user",
  status: "Active",
  isVerified: true,
  lastLogin: "Today, 08:00 AM",
  memberSince: "Jan 10, 2022",
};

export default function SuperUserProfilePage() {
  return <ProfilePage user={mockSuperUser} />;
}