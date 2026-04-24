'use client';

import { useState } from 'react';
import SuperDashboardHeader from '@/components/SuperUser/SuperDashboardHeader';
import SuperStatsGrid from '@/components/SuperUser/SuperStatsGrid';
import SuperWorkloadChartCard from '@/components/SuperUser/SuperWorkloadChartCard';
import '@/styles/SuperStyles/SuperDashboardLayout.css';

// ── Placeholder until SuperCriticalAlertsCard is created ──────
function SuperCriticalAlertsCard() {
  const alerts = [
    { id: '#SHP-9921', client: 'TechParts Inc.',  issue: 'Customs clearance missing', delay: '3 Days',   priority: 'Critical' },
    { id: '#SHP-5692', client: 'MediCare Supply', issue: 'Temperature excursion',      delay: '1 Day',    priority: 'Critical' },
    { id: '#SHP-8842', client: 'Global Retailers',issue: 'Driver delayed',             delay: '12 Hours', priority: 'High'     },
  ];
  return (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>Critical Alerts</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {alerts.map((a) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: 0 }}>{a.id} — {a.client}</p>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>{a.issue}</p>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '3px 8px', borderRadius: '99px' }}>
              {a.delay}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Placeholder until SuperRecentActivityTable is created ──────
function SuperRecentActivityTable({ dateRange }: { dateRange: { from: string; to: string } }) {
  const rows = [
    { id: '#US-99021', route: 'NYC → LDN', manager: 'John Doe',   status: 'In Transit',    etd: 'Oct 28, 2023' },
    { id: '#CN-88123', route: 'SHG → LAX', manager: 'Sarah Chen', status: 'Customs Hold',  etd: 'Oct 25, 2023' },
    { id: '#DE-11029', route: 'BER → PAR', manager: 'Marc Weber', status: 'Arrived at Port',etd: 'Oct 29, 2023' },
    { id: '#FR-44201', route: 'LYO → MAD', manager: 'Ana Lopez',  status: 'Processing',    etd: 'Oct 30, 2023' },
  ];
  const statusColor: Record<string, string> = {
    'In Transit':     '#2563eb',
    'Customs Hold':   '#dc2626',
    'Arrived at Port':'#16a34a',
    'Processing':     '#d97706',
  };
  return (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0 }}>Recent Department Activity</h3>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>{dateRange.from} — {dateRange.to}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
              {['Shipment ID', 'Origin / Destination', 'Manager', 'Status', 'ETD'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>{r.id}</td>
                <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>{r.route}</td>
                <td style={{ padding: '12px', fontSize: '13px', color: '#374151' }}>{r.manager}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: statusColor[r.status] ?? '#374151', background: `${statusColor[r.status]}15`, padding: '3px 10px', borderRadius: '99px' }}>
                    {r.status}
                  </span>
                </td>
                <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>{r.etd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function SuperUserDashboardPage() {
  const [range, setRange] = useState<{ from: string; to: string }>({
    from: '2023-10-24',
    to:   '2023-10-30',
  });

  return (
    <div className="super-inner">
      <SuperDashboardHeader onDateRangeChange={setRange} />

      <SuperStatsGrid />

      <SuperRecentActivityTable dateRange={range} />

      <div className="super-grid-2">
        <div className="super-grid-2__left">
          <SuperWorkloadChartCard />
        </div>
        <SuperCriticalAlertsCard />
      </div>
    </div>
  );
}