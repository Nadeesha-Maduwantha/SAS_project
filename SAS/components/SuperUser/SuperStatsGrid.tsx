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
        meta="+12%"
        metaTone="good"
      />
      <SuperStatCard
        icon={<AlertTriangle className="super-stat__icon super-stat__icon--red" />}
        label="Active Alerts"
        value="15"
        meta="+4!"
        metaTone="bad"
      />
      <SuperStatCard
        icon={<Users className="super-stat__icon super-stat__icon--purple" />}
        label="Team Members"
        value="42"
        meta="Active Now"
        metaTone="neutral"
      />
      <SuperStatCard
        icon={<CheckCircle2 className="super-stat__icon super-stat__icon--green" />}
        label="Success Rate"
        value="94.2%"
        meta="Goal: 98%"
        metaTone="neutral"
      />
    </div>
  );
}