import ProfilePage from "@/components/profile/ProfilePage";
import { UserProfile } from "@/types/profile";

const mockOperationUser: UserProfile = {
  id: "4",
  fullName: "Operation User",
  email: "opuser@dart.com",
  phoneNumber: "+94 77 456-7890",
  department: "Operations",
  role: "operation_user",
  status: "Active",
  isVerified: true,
  lastLogin: "Today, 07:45 AM",
  memberSince: "Jun 5, 2022",
};

export default function OperationUserProfilePage() {
  return <ProfilePage user={mockOperationUser} />;
}