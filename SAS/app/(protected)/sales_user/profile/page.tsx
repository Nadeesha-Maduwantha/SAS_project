import ProfilePage from "@/components/profile/ProfilePage";
import { UserProfile } from "@/types/profile";

const mockSalesUser: UserProfile = {
  id: "3",
  fullName: "Sales User",
  email: "salesuser@dart.com",
  phoneNumber: "+94 77 345-6789",
  department: "Sales",
  role: "sales_user",
  status: "Active",
  isVerified: false,
  lastLogin: "Yesterday, 05:30 PM",
  memberSince: "Mar 20, 2023",
};

export default function SalesUserProfilePage() {
  return <ProfilePage user={mockSalesUser} />;
}