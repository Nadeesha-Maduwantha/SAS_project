"use client";

import SuperStatsGrid from '@/components/SuperUser/SuperStatsGrid';
import SuperRecentActivityTable from '@/components/SuperUser/SuperRecentActivityTable';
import SuperCriticalAlertsCard from '@/components/SuperUser/SuperCriticalAlertsCard';
import '@/styles/SuperStyles/SuperDashboardLayout.css';
import SuperDashboardHeader from '@/components/SuperUser/SuperDashboardHeader';

export default function SuperUserDashboard() {
  return (
    <div className="super-dashboard">
      <SuperDashboardHeader />

      <div className="super-grid-2">
        <div className="super-grid-2__left">
          <SuperStatsGrid />
        </div>

        <div className="super-grid-2__right">
          <SuperCriticalAlertsCard />
        </div>
      </div>

      <div className="super-section-gap">
        <SuperRecentActivityTable />
      </div>

    </div>
  );
}