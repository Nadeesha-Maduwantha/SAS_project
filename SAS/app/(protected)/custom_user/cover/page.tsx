"use client";

import CoverAccessPanel from "@/components/shared/CoverAccessPanel";
import { useCoverEligibility } from "@/lib/hooks/useCoverEligibility";

// Reachable directly by URL even though the nav link is hidden for an
// ineligible custom type (System Settings -> User Types), so this still
// checks for itself rather than trusting the nav to have gated it. The real
// enforcement is server-side in services/cover_access.py's create_request();
// this is just the matching UI message.
export default function CustomUserCoverPage() {
  const { eligible, loading } = useCoverEligibility();

  if (loading) return null;

  if (!eligible) {
    return (
      <div style={{ padding: "28px 24px" }}>
        <div style={{
          padding: "16px 18px", background: "#F9FAFB", border: "1px solid #E5E7EB",
          borderRadius: 10, fontSize: 13, color: "#6B7280", maxWidth: 480,
        }}>
          Cover Access isn't enabled for your account type. An admin can turn it on from
          System Settings → User Types.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 24px" }}>
      <CoverAccessPanel />
    </div>
  );
}
