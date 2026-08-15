import AdminHeader from '@/components/AdminUser/AdminHeader';
import AdminOverviewMetricCards from '@/components/AdminUser/AdminOverviewMetricCards';
import AdminDashboardAnalytics from '@/components/AdminUser/AdminDashboardAnalytics';
import AlertFeedTable from '@/components/shared/AlertFeedTable';
import PinnedTableStatCards from '@/components/shared/PinnedTableStatCard';
import ProgressLogs from '@/components/AdminUser/ProgressLogs';
import SystemTechnicalLogs from '@/components/AdminUser/SystemTechnicalLogs';
import '@/styles/AdminStyles/AdminLayout.css';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5001';

export default function AdminDashboardPage() {
  return (
    <div className="admin-inner">
      <AdminHeader />

      {/* Admin overview stat cards */}
      <AdminOverviewMetricCards />

      <AdminDashboardAnalytics />

      {/* Pinned custom table cards — only if user has pinned tables */}
      <PinnedTableStatCards />

      {/* Alert feed hidden for this layout */}
      {/* <div className="section-gap">
        <AlertFeedTable
          title="Admin Shipment Alert Feed"
          apiBase={API}
          maxRows={8}
        />
      </div> */}

      <div className="bottom-grid">
        <ProgressLogs />
        <SystemTechnicalLogs />
      </div>
    </div>
  );
}
