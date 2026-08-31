"use client";
import { useState, useEffect } from 'react';
import AdminHeader from '@/components/AdminUser/AdminHeader';
import AdminOverviewMetricCards from '@/components/AdminUser/AdminOverviewMetricCards';
import AdminDashboardAnalytics from '@/components/AdminUser/AdminDashboardAnalytics';
import AlertFeedTable from '@/components/shared/AlertFeedTable';
import PinnedTableStatCards from '@/components/shared/PinnedTableStatCard';
import ProgressLogs from '@/components/AdminUser/ProgressLogs';
import SystemTechnicalLogs from '@/components/AdminUser/SystemTechnicalLogs';
import ShipmentFeed, { type ShipmentFeedItem } from '@/components/AdminUser/ShipmentFeed';
import SyncSummaryCard from '@/components/AdminUser/SyncSummaryCard';
import '@/styles/AdminStyles/AdminLayout.css';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';

async function fetchDashboardData<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    const payload = await response.json();

    if (!response.ok) {
      console.error(payload.error || `Request failed: ${url}`);
      return fallback;
    }

    return payload.data ?? fallback;
  } catch (error) {
    console.error('Dashboard fetch failed:', error);
    return fallback;
  }
}

export default function AdminDashboardPage() {
  const [shipments, setShipments] = useState<ShipmentFeedItem[]>([]);
  const [metrics, setMetrics] = useState({
    total_users: 0,
    active_alerts: 0,
    total_emails: 0,
    success_rate: 0
  });

  useEffect(() => {
    fetchDashboardData(
      `${API}/api/dashboard/admin/shipment-feed`,
      []
    ).then(setShipments);

    fetchDashboardData(
      `${API}/api/dashboard/admin/metrics`,
      {
      total_users: 0,
      active_alerts: 0,
      total_emails: 0,
      success_rate: 0,
      }
    ).then(setMetrics);
  }, []);

  return (
    <div className="admin-inner">
      <AdminHeader />

      {/* Admin overview stat cards */}
      <AdminOverviewMetricCards />

      <AdminDashboardAnalytics />

      {/* Pinned custom table cards — only if user has pinned tables */}
      <PinnedTableStatCards />

      {/* Scoped alert feed — all overdue / delayed milestones + field mismatches */}
      <div className="section-gap">
        <AlertFeedTable
          title="Admin Shipment Alert Feed"
          apiBase={API}
          maxRows={8}
          showFieldDelayed
          scope="admin"
        />
      </div>

      <div className="bottom-grid">
        <ProgressLogs />
        <SyncSummaryCard />
      </div>
      <div className="section-gap">
        <ShipmentFeed data={shipments} />

      </div>
    </div>
  );
}
