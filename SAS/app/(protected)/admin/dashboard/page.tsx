"use client"; 
import AdminHeader from '@/components/AdminUser/AdminHeader';
import StatCard from '@/components/AdminUser/StatCard';
import ShipmentFeed from '@/components/AdminUser/ShipmentFeed';
import ProgressLogs from '@/components/AdminUser/ProgressLogs';
import SystemTechnicalLogs from '@/components/AdminUser/SystemTechnicalLogs';
import { useEffect, useState } from "react";
import { ShieldCheck, Users, BellRing, Mail } from 'lucide-react';
import '@/styles/AdminStyles/AdminLayout.css';


export default function AdminDashboardPage() {
  const [shipments, setShipments] = useState([]);
  const [metrics, setMetrics] = useState({
  total_users: 0,
  active_alerts: 0,
  total_emails: 0,
  success_rate: 0 });

  useEffect(() => {
    fetch("http://127.0.0.1:5001/api/dashboard/admin/shipment-feed")
      .then(res => res.json())
      .then(data => {
        setShipments(data.data);
      });
      // 🔥 ADD THIS (metrics API)
    fetch("http://127.0.0.1:5001/api/dashboard/admin/metrics")
      .then(res => res.json())
      .then(data => {
         setMetrics(data.data);
     });
  }, []);

  return (
    <div className="admin-inner">
      <AdminHeader />

      <div className="stats-grid">
        <StatCard
  title="Milestone Success Rate"
  value={`${metrics.success_rate}%`}
  icon={<ShieldCheck size={16} />}
/>

<StatCard
  title="Total Users"
  value={metrics.total_users.toString()}
  icon={<Users size={16} />}
/>

<StatCard
  title="Active Alerts"
  value={metrics.active_alerts.toString()}
  icon={<BellRing size={16} />}
/>

<StatCard
  title="Total Generated Emails"
  value={metrics.total_emails.toString()}
  icon={<Mail size={16} />}
/>
      </div>

      <div className="section-gap">
        <ShipmentFeed data={shipments} />
    
      </div>

      <div className="bottom-grid">
        <ProgressLogs />
        <SystemTechnicalLogs />
      </div>
    </div>
  );
}