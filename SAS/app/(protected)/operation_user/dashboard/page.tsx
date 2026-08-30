// app/(protected)/operation_user/dashboard/page.tsx
// Everything here is scoped to the signed-in operation user. They are assigned
// to individual milestones (shipment_milestones.assigned_email), so the stat
// cards count only shipments they hold a milestone on, and the feed lists those
// milestones rather than whole shipments.
import UserDashboardMetricCards from '@/components/shared/UserDashboardMetricCards';
import ShipmentFeedTable from '@/components/shared/ShipmentFeedTable';
import PinnedTableStatCards from '@/components/shared/PinnedTableStatCard';

export default function OperationDashboardPage() {
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
        Operations Dashboard
      </h1>

      {/* My Shipments + My Alerts stat cards */}
      <UserDashboardMetricCards />

      {/* Pinned custom table stat cards */}
      <PinnedTableStatCards />

      {/* The 5 shipments assigned to this user with the nearest pickup dates */}
      <div style={{ marginTop: 14 }}>
        <ShipmentFeedTable
          title="Shipment Feed"
          subtitle="Your next 5 shipments by pickup date"
          maxRows={5}
          viewAllHref="/operation_user/shipments"
        />
      </div>
    </div>
  );
}
