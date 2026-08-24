// app/(protected)/Super_user/dashboard/page.tsx
// Super User runs sea freight, so only the SEA breakdown is shown here.
// The Department Alert Feed was replaced by the branch delay breakdown.
import SuperDashboardAnalytics from '@/components/SuperUser/SuperDashboardAnalytics';
import SuperBranchDelayCard from '@/components/SuperUser/SuperBranchDelayCard';
import PinnedTableStatCards from '@/components/shared/PinnedTableStatCard';

export default function SuperDashboardPage() {
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
        Super User Dashboard
      </h1>

      {/* Sea freight breakdown + overall shipment summary */}
      <SuperDashboardAnalytics />

      {/* Pinned custom table stat cards */}
      <PinnedTableStatCards />

      {/* Where the delays sit, by branch */}
      <SuperBranchDelayCard />
    </div>
  );
}
