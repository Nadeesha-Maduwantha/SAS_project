// app/(protected)/operation_user/dashboard/page.tsx
// The Department Alert Feed was replaced by a preview of the shipments table.
import UserDashboardMetricCards from '@/components/shared/UserDashboardMetricCards';
import ShipmentFeedTable from '@/components/shared/ShipmentFeedTable';
import AlertFeedTable from '@/components/shared/AlertFeedTable';
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
      <UserDashboardMetricCards scope="operation" />

      {/* Pinned custom table stat cards */}
      <PinnedTableStatCards />

      {/* First few rows of the shipments page, as a feed */}
      <div style={{ marginTop: 14 }}>
        <ShipmentFeedTable
          title="Shipment Feed"
          subtitle="Most recent shipments assigned to you"
          maxRows={5}
          viewAllHref="/operation_user/shipments"
        />
      </div>

      {/* Scoped alert feed — overdue / delayed milestones for this user */}
      <div style={{ marginTop: 14 }}>
        <AlertFeedTable
          title="My Alert Feed"
          apiBase="http://localhost:5000"
          maxRows={8}
          scope="operation"
        />
      </div>
    </div>
  );
}
