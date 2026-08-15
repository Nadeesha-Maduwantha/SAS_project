// app/(protected)/Super_user/dashboard/page.tsx
// Super User sees same full metric cards as admin (AIR/SEA/Critical/Summary)
import DashboardMetricCards from '@/components/AdminUser/DashboardMetricCards';
import AlertFeedTable from '@/components/shared/AlertFeedTable';
import PinnedTableStatCards from '@/components/shared/PinnedTableStatCard';

export default function SuperDashboardPage() {
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 20, letterSpacing: '-0.02em' }}>
        Super User Dashboard
      </h1>

      {/* Full metric cards — same as admin */}
      <DashboardMetricCards />

      {/* Pinned custom table stat cards */}
      <PinnedTableStatCards />

      {/* Alert feed */}
      <div style={{ marginTop: 4 }}>
        <AlertFeedTable
          title="Department Alert Feed"
          apiBase="http://127.0.0.1:5000"
          maxRows={8}
        />
      </div>
    </div>
  );
}