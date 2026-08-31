// app/(protected)/sales_user/dashboard/page.tsx
// The shipment alert feed was replaced by a personal notepad.
import UserDashboardMetricCards from '@/components/shared/UserDashboardMetricCards';
import NotePad from '@/components/shared/NotePad';
import AlertFeedTable from '@/components/shared/AlertFeedTable';
import PinnedTableStatCards from '@/components/shared/PinnedTableStatCard';

export default function SalesDashboardPage() {
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
        Sales Dashboard
      </h1>

      {/* My Shipments + My Alerts stat cards */}
      <UserDashboardMetricCards scope="sales" />

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
          apiBase="http://localhost:5000"
          maxRows={8}
          scope="sales"
        />
      </div>
    </div>
  );
}
