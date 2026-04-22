import SuperStatCard from '@/components/SuperUser/SuperStatCard';
import { Truck, AlertTriangle, Users, CheckCircle2 } from 'lucide-react';
import '@/styles/SuperStyles/SuperStatsGrid.css';

export default function SuperStatsGrid() {
  return (
    <div className="super-stats">
      <SuperStatCard
        icon={<Truck className="super-stat__icon super-stat__icon--blue" />}
        label="Department Shipments"
        value="1,284"
        
      />
      <SuperStatCard
        icon={<AlertTriangle className="super-stat__icon super-stat__icon--red" />}
        label="Active Alerts"
        value="15"
        
      />
      <SuperStatCard
        icon={<Users className="super-stat__icon super-stat__icon--purple" />}
        label="Team Members"
        value="42"
        
      />
      <SuperStatCard
        icon={<CheckCircle2 className="super-stat__icon super-stat__icon--green" />}
        label="Success Rate"
        value="94.2%"
        
      />
    </div>
  );
}