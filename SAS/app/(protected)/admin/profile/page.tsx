import ProfilePage from "@/components/profile/ProfilePage";
import { UserProfile } from "@/types/profile";

// Mock data - replace with real API fetch
const mockAdminUser: UserProfile = {
  id: "1",
  fullName: "Amal Perera",
  email: "amalperera@dart.com",
  phoneNumber: "+94 77 123-4567",
  department: "System Administration",
  role: "admin",
  status: "Active",
  isVerified: true,
  lastLogin: "Today, 09:15 AM",
  memberSince: "Oct 15, 2021",
};

export default function AdminProfilePage() {
  return <ProfilePage user={mockAdminUser} />;
}