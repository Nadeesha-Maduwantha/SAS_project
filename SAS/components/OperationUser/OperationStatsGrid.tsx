import OperationStatCard from '@/components/OperationUser/OperationStatCard';
import { CheckCircle2, Truck, Users, AlertTriangle } from 'lucide-react';
import '@/styles/OperationStyles/OperationStatsGrid.css';

export default function OperationStatsGrid() {
  return (
    <div className="op-stats">
      
      <OperationStatCard
        icon={<Truck className="super-stat__icon super-stat__icon--blue" />}
        title="Department Shipments"
        value="24"
      />

      {/* <OperationStatCard
        icon={<Users className="super-stat__icon super-stat__icon--purple" />}
        title="Team Members"
        value="5"
      /> */}

      <OperationStatCard
        icon={<AlertTriangle className="super-stat__icon super-stat__icon--red" />}
        title="Overdue Shipments"
        value="5"
      />

      <OperationStatCard
        icon={<CheckCircle2 className="super-stat__icon super-stat__icon--green" />}
        title="Critical Milestones"
        value="10"
      />

    </div>
  );
}