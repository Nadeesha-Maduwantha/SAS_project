import OperationLeftNavBar from '@/components/OperationUser/OperationLeftNavBar';

import OperationDashboardHeader from '@/components/OperationUser/OperationDashboardHeader';
import OperationStatsGrid from '@/components/OperationUser/OperationStatsGrid';
import OperationPriorityShipments from '@/components/OperationUser/OperationPriorityShipments';

import '@/styles/OperationStyles/OperationDashboardLayout.css';

export default function OperationUserDashboardPage() {
  return (
    <div className="op-layout">
      <OperationLeftNavBar />

      <div className="op-content">
        <div className="op-inner">
          <OperationDashboardHeader />
          <OperationStatsGrid />
          <OperationPriorityShipments />
        </div>
      </div>
    </div>
  );
}