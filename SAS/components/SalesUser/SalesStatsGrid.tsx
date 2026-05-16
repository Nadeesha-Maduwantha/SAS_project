import SalesStatCard from '@/components/SalesUser/SalesStatCard';
import '@/styles/SalesStyles/SalesStatsGrid.css';
import { ClipboardList, Truck, Anchor, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function SalesStatsGrid() {
  return (
    <div className="sales-stats">
      <SalesStatCard
        
        icon={<Truck className="super-stat__icon super-stat__icon--blue" />}
        title="Department Shipments"
        value="24"
      />

      <SalesStatCard
        
        icon={<AlertTriangle className="super-stat__icon super-stat__icon--red" />}
        title="Overdue Shipments"
        value="5"
      />

      <SalesStatCard
       
         icon={<CheckCircle2 className="super-stat__icon super-stat__icon--green" />}
        title="Critical Milestones"
        value="10"
      />

      {/* <SalesStatCard
        
        title="Delivered"
        value="86"
        
        icon={<CheckCircle2 className="sales-stat__icon sales-stat__icon--green" />}
      /> */}
    </div>
  );
}