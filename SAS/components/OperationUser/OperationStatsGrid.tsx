import OperationStatCard from '@/components/OperationUser/OperationStatCard';
import { ClipboardList, Truck, Anchor, AlertTriangle } from 'lucide-react';
import '@/styles/OperationStyles/OperationStatsGrid.css';

export default function OperationStatsGrid() {
  return (
    <div className="op-stats">
      <OperationStatCard
        title="Processing"
        value="24"
        //meta="+12%"
        //tone="blue"
        icon={<ClipboardList className="op-stat__icon op-stat__icon--blue" />}
      />
      <OperationStatCard
        title="In Transit"
        value="142"
        //meta="Active"
        //tone="purple"
        icon={<Truck className="op-stat__icon op-stat__icon--purple" />}
      />
      <OperationStatCard
        title="Arrived at Port"
        value="18"
        //meta="Last 24h"
        //tone="green"
        icon={<Anchor className="op-stat__icon op-stat__icon--green" />}
      />
      <OperationStatCard
        title="Delayed"
        value="3"
        //meta="Action Req."
        //tone="red"
        icon={<AlertTriangle className="op-stat__icon op-stat__icon--red" />}
      />
    </div>
  );
}