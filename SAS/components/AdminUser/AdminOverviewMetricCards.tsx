'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Mail, ShieldCheck } from 'lucide-react';
import StatCard from '@/components/AdminUser/StatCard';

type AdminMetrics = {
  success_rate: number;
  total_emails: number;
  active_alerts: number;
  critical_alerts?: number;
  alert_shipments?: number;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toLocaleString() : '0';
}

export default function AdminOverviewMetricCards() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetrics() {
      try {
        setError(null);
        const response = await fetch(`${API}/api/dashboard/admin/metrics`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        setMetrics(result.data ?? null);
      } catch (err) {
        console.error('Failed to load admin dashboard metrics:', err);
        setError('Could not load dashboard metrics');
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, []);

  const cards = [
    {
      title: 'Milestone Success Rate',
      value: loading ? '...' : `${metrics?.success_rate ?? 0}%`,
      hint: error ?? 'Completed milestones percentage',
      tag: 'Live',
      icon: <ShieldCheck size={18} color="var(--c-success)" />,
    },
    {
      title: 'Total Sent Emails',
      value: loading ? '...' : formatNumber(metrics?.total_emails ?? 0),
      hint: 'Sales digest emails successfully sent',
      tag: 'Sent',
      icon: <Mail size={18} color="var(--c-accent)" />,
    },
    {
      title: 'Active Alerts',
      value: loading ? '...' : formatNumber(metrics?.active_alerts ?? 0),
      // An alert is one overdue milestone, so the count runs well ahead of the
      // number of shipments. Spell both out rather than leaving it ambiguous.
      hint: loading
        ? 'Overdue milestones requiring attention'
        : `${formatNumber(metrics?.critical_alerts ?? 0)} critical, across ${formatNumber(metrics?.alert_shipments ?? 0)} shipments`,
      tag: 'Active',
      icon: <AlertTriangle size={18} color="var(--c-danger)" />,
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 12,
        marginBottom: 20,
      }}
    >
      {cards.map((card) => (
        <StatCard
          key={card.title}
          title={card.title}
          value={card.value}
          hint={card.hint}
          tag={card.tag}
          icon={card.icon}
        />
      ))}
    </div>
  );
}
