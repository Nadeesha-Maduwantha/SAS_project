"use client";

import MilestoneBoard from "@/components/shared/MilestoneBoard";

export default function CurrentMilestonePage() {
  return (
    <MilestoneBoard
      detailBase="/admin/milestone_detail"
      canByMember={true}
      scope="admin"
    />
  );
}
