"use client";

import MilestoneBoard from "@/components/shared/MilestoneBoard";
import { useAuth } from "@/lib/hooks/useAuth";

// Copy of sales_user's current_milestone page for custom user types — scoped
// by this account's own role (the custom type's key) instead of "sales", and
// pointed at the custom_user detail route.
export default function CurrentMilestonePage() {
  const { role } = useAuth();
  return (
    <MilestoneBoard
      detailBase="/custom_user/milestone_detail"
      canByMember={false}
      scope={role}
    />
  );
}
