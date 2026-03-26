import AdminLeftNavBar from '@/components/AdminUser/AdminLeftNavBar';
import AdminTopBar from '@/components/AdminUser/AdminTopBar';
import AdminHeader from '@/components/AdminUser/AdminHeader';
import AdminBanner from '@/components/AdminUser/AdminBanner';
import StatCard from '@/components/AdminUser/StatCard';
import ShipmentFeed from '@/components/AdminUser/ShipmentFeed';
import ProgressLogs from '@/components/AdminUser/ProgressLogs';
import SystemTechnicalLogs from '@/components/AdminUser/SystemTechnicalLogs';

import { ShieldCheck, Users, BellRing, Mail } from 'lucide-react';
import '@/styles/AdminStyles/AdminLayout.css';

export default function AdminDashboardPage() {
  return (
    <div className="admin-layout">
      
      {/* LEFT SIDEBAR */}
      <AdminLeftNavBar />

      {/* RIGHT CONTENT AREA */}
      <div className="admin-content">
        <AdminTopBar />

        <div className="admin-inner">
          <AdminHeader />

          <div className="section-gap">
            <AdminBanner />
          </div>

          <div className="stats-grid">
            <StatCard
              title="Milestone Success Rate"
              value="99.8%"
              hint="All services online"
              tag="Optimal"
              icon={<ShieldCheck size={16} />}
            />
            <StatCard
              title="Total Users"
              value="1,482"
              hint="Across 12 Global Branches"
              tag="+12 Today"
              icon={<Users size={16} />}
            />
            <StatCard
              title="Active Alerts"
              value="08"
              hint="3 Critical alerts"
              tag="Priority"
              icon={<BellRing size={16} />}
            />
            <StatCard
              title="Total Generated Emails"
              value="94"
              hint="+21% from last week"
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
      </div>
    </div>
  );
}