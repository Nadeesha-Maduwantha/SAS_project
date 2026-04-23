import AdminHeader from '@/components/AdminUser/AdminHeader';
import StatCard from '@/components/AdminUser/StatCard';
import ShipmentFeed from '@/components/AdminUser/ShipmentFeed';
import ProgressLogs from '@/components/AdminUser/ProgressLogs';
import SystemTechnicalLogs from '@/components/AdminUser/SystemTechnicalLogs';

import { ShieldCheck, Users, BellRing, Mail } from 'lucide-react';
import '@/styles/AdminStyles/AdminLayout.css';

export default function AdminDashboardPage() {
  return (
    <div className="admin-inner">
      <AdminHeader />

      <div className="stats-grid">
        <StatCard
          title="Milestone Success Rate"
          value="99.8%"
          icon={<ShieldCheck size={16} />}
        />
        <StatCard
          title="Total Users"
          value="1,482"
          icon={<Users size={16} />}
        />
        <StatCard
          title="Active Alerts"
          value="08"
          icon={<BellRing size={16} />}
        />
        <StatCard
          title="Total Generated Emails"
          value="94"
          icon={<Mail size={16} />}
        />
      </div>

      <div className="section-gap">
        <ShipmentFeed />
      </div>

      <div className="bottom-grid">
        <ProgressLogs />
        <SystemTechnicalLogs />
      </div>
    </div>
  );
}