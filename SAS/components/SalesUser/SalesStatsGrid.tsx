import SalesStatCard from '@/components/SalesUser/SalesStatCard';
import '@/styles/SalesStyles/SalesStatsGrid.css';
import { ClipboardList, Truck, Anchor, CheckCircle2 } from 'lucide-react';

export default function SalesStatsGrid() {
  return (
    <div className="sales-stats">
      <SalesStatCard
        tone="amber"
        title="Processing"
        value="24"
        
        icon={<ClipboardList className="sales-stat__icon sales-stat__icon--amber" />}
      />

      <SalesStatCard
        tone="blue"
        title="In Transit"
        value="142"
        
        icon={<Truck className="sales-stat__icon sales-stat__icon--blue" />}
      />

      <SalesStatCard
        tone="purple"
        title="Arrived at Port"
        value="18"
        
        icon={<Anchor className="sales-stat__icon sales-stat__icon--purple" />}
      />

      <SalesStatCard
        tone="green"
        title="Delivered"
        value="86"
        
        icon={<CheckCircle2 className="sales-stat__icon sales-stat__icon--green" />}
      />
    </div>
  );
}