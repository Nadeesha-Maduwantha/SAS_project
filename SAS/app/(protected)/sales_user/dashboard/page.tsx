// app/(protected)/sales_user/dashboard/page.tsx
// The shipment alert feed was replaced by a personal notepad.
import UserDashboardMetricCards from '@/components/shared/UserDashboardMetricCards';
import NotePad from '@/components/shared/NotePad';
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
      <UserDashboardMetricCards />

      {/* Pinned custom table stat cards */}
      <PinnedTableStatCards />

      {/* Personal notepad — private to the signed-in user */}
      <div style={{ marginTop: 14 }}>
        <NotePad title="My Notes" subtitle="Private to you — link a note to one of your shipments" />
      </div>
    </div>
  );
}
