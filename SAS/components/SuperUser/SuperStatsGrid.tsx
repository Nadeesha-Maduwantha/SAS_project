"use client";

import SuperStatCard from '@/components/SuperUser/SuperStatCard';
import { Truck, AlertTriangle, Users, CheckCircle2 } from 'lucide-react';
import '@/styles/SuperStyles/SuperStatsGrid.css';
import { useEffect, useState } from "react";

export default function SuperStatsGrid() {

  // ✅ MOVE INSIDE COMPONENT
  const [data, setData] = useState({
    department_shipments: 0,
    team_members: 0,
    overdue_shipments: 0,
    critical_milestones: 0
  });

  // ✅ ALSO INSIDE COMPONENT
  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/dashboard/super/metrics")
      .then(res => res.json())
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="super-stats">

      <SuperStatCard
        icon={<Truck className="super-stat__icon super-stat__icon--blue" />}
        label="Department Shipments"
        value={data.department_shipments.toString()}
      />

      <SuperStatCard
        icon={<Users className="super-stat__icon super-stat__icon--purple" />}
        label="Team Members"
        value={data.team_members.toString()}
      />

      <SuperStatCard
        icon={<AlertTriangle className="super-stat__icon super-stat__icon--red" />}
        label="Overdue Shipments"
        value={data.overdue_shipments.toString()}
      />

      <SuperStatCard
        icon={<CheckCircle2 className="super-stat__icon super-stat__icon--green" />}
        label="Critical Milestones"
        value={data.critical_milestones.toString()}
      />

    </div>
  );
}