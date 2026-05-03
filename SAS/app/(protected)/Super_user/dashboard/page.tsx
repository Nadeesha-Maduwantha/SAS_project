"use client";

import SuperStatsGrid from '@/components/SuperUser/SuperStatsGrid';
import SuperRecentActivityTable from '@/components/SuperUser/SuperRecentActivityTable';
import SuperWorkloadChartCard from '@/components/SuperUser/SuperWorkloadChartCard';
import SuperCriticalAlertsCard from '@/components/SuperUser/SuperCriticalAlertsCard';

export default function SuperUserDashboard() {
  return (
    <div className="super-dashboard">

      
      <SuperStatsGrid />

      
      <div className="super-section-gap">
        <SuperRecentActivityTable />
      </div>

      
      <div className="super-grid-2">
        <div className="super-grid-2__left">
          <SuperWorkloadChartCard />
        </div>
        <SuperCriticalAlertsCard />
      </div>

    </div>
  );
}