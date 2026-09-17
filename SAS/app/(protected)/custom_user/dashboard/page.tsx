// app/(protected)/custom_user/dashboard/page.tsx
// Copy of the sales_user dashboard for admin-defined custom user types
// (System Settings -> User Types). Only the scope is different: instead of
// the hardcoded "sales" scope, it uses this account's own role — which is
// the custom type's key — so every card/table below is scoped by that
// type's own field mapping (field_table/field_column), never the sales
// user's field. See services/scope.py's allowed_shipment_ids custom-type
// branch.
'use client';
import UserDashboardMetricCards from '@/components/shared/UserDashboardMetricCards';
import NotePad from '@/components/shared/NotePad';
import AlertFeedTable from '@/components/shared/AlertFeedTable';
import PinnedTableStatCards from '@/components/shared/PinnedTableStatCard';
import { useAuth } from '@/lib/hooks/useAuth';

export default function CustomUserDashboardPage() {
  const { role } = useAuth();

  return (
    <div>
      <h1
        style={{
          fontSize: 'var(--fs-lg)',
          fontWeight: 'var(--fw-bold)' as any,
          color: 'var(--c-text-strong)',
          marginBottom: 20,
        }}
      >
        Dashboard
      </h1>

      {/* My Shipments + My Alerts stat cards */}
      <UserDashboardMetricCards scope={role} />

      {/* Pinned custom table stat cards */}
      <PinnedTableStatCards />

      {/* Personal notepad, saved per staff code */}
      <div style={{ marginTop: 14 }}>
        <NotePad title="My Notes" subtitle="Personal notes — saved to your account" />
      </div>

      {/* Scoped alert feed — overdue / delayed milestones for this user */}
      <div style={{ marginTop: 14 }}>
        <AlertFeedTable
          title="My Shipment Alert Feed"
          apiBase="http://127.0.0.1:5000"
          maxRows={8}
          scope={role}
        />
      </div>
    </div>
  );
}
