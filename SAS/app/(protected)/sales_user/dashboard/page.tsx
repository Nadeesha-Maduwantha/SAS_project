import SalesLeftNavBar from '@/components/SalesUser/SalesLeftNavBar';

import SalesDashboardHeader from '@/components/SalesUser/SalesDashboardHeader';
import SalesSectionTitle from '@/components/SalesUser/SalesSectionTitle';
import SalesStatsGrid from '@/components/SalesUser/SalesStatsGrid';
import SalesPriorityShipments from '@/components/SalesUser/SalesPriorityShipments';

import { BarChart3, Star } from 'lucide-react';
import '@/styles/SalesStyles/SalesDashboardLayout.css';

export default function SalesUserDashboardPage() {
  return (
    <div className="sales-layout">
      <SalesLeftNavBar />

      <div className="sales-content">
        <div className="sales-inner">
          <SalesDashboardHeader name="Alex" />

          <SalesSectionTitle
            icon={<BarChart3 className="w-4 h-4" />}
            title="Current Shipment States"
          />

          <SalesStatsGrid />

          <SalesSectionTitle
            icon={<Star className="w-4 h-4" />}
            title="Priority Shipments"
            right={
              <button className="text-blue-600 font-black hover:text-blue-700">
                View All →
              </button>
            }
          />

          <SalesPriorityShipments />
        </div>
      </div>
    </div>
  );
}