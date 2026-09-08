"use client";

import MilestoneBoard from "@/components/shared/MilestoneBoard";

export default function CurrentMilestonePage() {
  return (
    <MilestoneBoard
      detailBase="/operation_user/milestone_detail"
      canByMember={false}
      scope="operation"
    />
  );
}
