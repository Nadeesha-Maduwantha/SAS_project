'use client';

import { useState } from 'react';

import SuperLeftNavBar from '@/components/SuperUser/SuperLeftNavBar';

import SuperDashboardHeader from '../../../../components/SuperUser/SuperDashboardHeader';
import SuperStatsGrid from '@/components/SuperUser/SuperStatsGrid';
import SuperWorkloadChartCard from '@/components/SuperUser/SuperWorkloadChartCard';
import SuperCriticalAlertsCard from '@/components/SuperUser/SuperCriticalAlertsCard';
import SuperRecentActivityTable from '@/components/SuperUser/SuperRecentActivityTable';

import '@/styles/SuperStyles/SuperDashboardLayout.css';

export default function SuperUserDashboardPage() {
  const [range, setRange] = useState<{ from: string; to: string }>({
    from: '2023-10-24',
    to: '2023-10-30',
  });

  return (
    <div className="super-layout">
      <SuperLeftNavBar />

      <div className="super-content">
        <div className="super-inner">
          <SuperDashboardHeader onDateRangeChange={setRange} />

          <SuperStatsGrid />

          <SuperRecentActivityTable dateRange={range} />

          <div className="super-grid-2">
            <div className="super-grid-2__left">
              <SuperWorkloadChartCard />
            </div>
            <SuperCriticalAlertsCard />
          </div>
        </div>
      </div>
    </div>
  );
}