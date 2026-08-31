// app/(protected)/sales_user/dashboard/page.tsx
import UserDashboardMetricCards from '@/components/shared/UserDashboardMetricCards';
import AlertFeedTable from '@/components/shared/AlertFeedTable';
import PinnedTableStatCards from '@/components/shared/PinnedTableStatCard';

export default function SalesDashboardPage() {
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 20, letterSpacing: '-0.02em' }}>
        Sales Dashboard
      </h1>

      {/* My Shipments + My Alerts stat cards */}
      <UserDashboardMetricCards scope="sales" />

      {/* Pinned custom table stat cards */}
      <PinnedTableStatCards />

      {/* Alert feed — shows all active alerts (filtered by user when auth wired) */}
      <div style={{ marginTop: 4 }}>
        <AlertFeedTable
          title="My Shipment Alert Feed"
          apiBase="http://localhost:5000"
          maxRows={8}
          scope="sales"
        />
      </div>
    </div>
  );
}