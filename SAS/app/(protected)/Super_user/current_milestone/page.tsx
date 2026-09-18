"use client";

import MilestoneBoard from "@/components/shared/MilestoneBoard";

export default function CurrentMilestonePage() {
  return (
    <MilestoneBoard
      detailBase="/Super_user/milestone_detail"
      canByMember={true}
      scope="super"
    />
  );
}
