import SalesDashboardHeader from '@/components/SalesUser/SalesDashboardHeader';
import SalesSectionTitle from '@/components/SalesUser/SalesSectionTitle';
import SalesStatsGrid from '@/components/SalesUser/SalesStatsGrid';
import SalesPriorityShipments from '@/components/SalesUser/SalesPriorityShipments';

import { BarChart3, Star } from 'lucide-react';

export default function SalesUserDashboardPage() {
  return (
    <div>
      <SalesDashboardHeader />

      

      <SalesStatsGrid />

      <SalesSectionTitle
        
        title="Priority Shipments" 
      />

      <SalesPriorityShipments />
    </div>
  );
}