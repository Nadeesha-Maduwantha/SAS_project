"use client";
import { useState, useEffect } from 'react';
import AdminHeader from '@/components/AdminUser/AdminHeader';
import DashboardMetricCards from '@/components/AdminUser/DashboardMetricCards';
import AlertFeedTable from '@/components/shared/AlertFeedTable';
import PinnedTableStatCards from '@/components/shared/PinnedTableStatCard';
import ProgressLogs from '@/components/AdminUser/ProgressLogs';
import SystemTechnicalLogs from '@/components/AdminUser/SystemTechnicalLogs';
import ShipmentFeed, { type ShipmentFeedItem } from '@/components/AdminUser/ShipmentFeed';
import '@/styles/AdminStyles/AdminLayout.css';

import SyncSummaryCard from '@/components/AdminUser/SyncSummaryCard';

// ─── Sync Status Data ───
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
const MOCK_SYNC_STATUS = {
  lastSyncTime: '2026-02-22T08:00:00',
  status: 'partial' as 'success' | 'failed' | 'partial',
  recordsUpdated: 142,
  validationErrors: 3,
};




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
      `${API_BASE_URL}/api/dashboard/admin/shipment-feed`,
      []
    ).then(setShipments);

    fetchDashboardData(
      `${API_BASE_URL}/api/dashboard/admin/metrics`,
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

      {/*
        Two narrow stat cards:
        Left  — Department Overview (AIR + SEA: ongoing / overdue / completed)
        Right — Shipment Summary (total completed + totals)
      */}
      <DashboardMetricCards />

      {/* Pinned custom table cards — only if user has pinned tables */}
      <PinnedTableStatCards />

      {/* Alert feed */}
      <div className="section-gap">
        <AlertFeedTable
          title="Admin Shipment Alert Feed"
          apiBase="http://localhost:5000"
          maxRows={8}
        />
      </div>

      <div className="bottom-grid">
        <ProgressLogs />
        <SyncSummaryCard syncData={MOCK_SYNC_STATUS} />
      </div>
      <div className="section-gap">
        <ShipmentFeed data={shipments} />

      </div>
    </div>
  );
}
