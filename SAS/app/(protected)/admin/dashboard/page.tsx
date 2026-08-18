import AdminHeader from '@/components/AdminUser/AdminHeader';
import DashboardMetricCards from '@/components/AdminUser/DashboardMetricCards';
import AlertFeedTable from '@/components/shared/AlertFeedTable';
import PinnedTableStatCards from '@/components/shared/PinnedTableStatCard';
import ProgressLogs from '@/components/AdminUser/ProgressLogs';
import SystemTechnicalLogs from '@/components/AdminUser/SystemTechnicalLogs';
import '@/styles/AdminStyles/AdminLayout.css';

export default function AdminDashboardPage() {
  return (
    <div className="admin-inner">
      <AdminHeader />

      {/*
        Two narrow stat cards:
        Left  — Department Overview (AIR + SEA: ongoing / overdue / completed)
        Right — Shipment Summary (total completed + totals)
      */}
      <DashboardMetricCards />

      {/* Pinned custom table cards — only if user has pinned tables */}
      <PinnedTableStatCards />

      {/* Alert feed */}
      <div className="section-gap">
        <AlertFeedTable
          title="Admin Shipment Alert Feed"
          apiBase="http://localhost:5000"
          maxRows={8}
          showFieldDelayed
        />
      </div>

      <div className="bottom-grid">
        <ProgressLogs />
        <SystemTechnicalLogs />
      </div>
    </div>
  );
}