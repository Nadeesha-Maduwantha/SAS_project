'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import DonutChart, { DonutLegendRow, type DonutSlice } from '@/components/shared/DonutChart';
import { normalizeRole, formatRoleLabel, roleColor } from '@/lib/roles';
import '@/styles/AdminStyles/StatCard.css';

type UserMetrics = {
  total_users: number;
  user_roles?: Record<string, number>;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toLocaleString() : '0';
}

function buildUserRoleSlices(roles: Record<string, number> = {}): DonutSlice[] {
  // The API keys roles by their raw stored spelling, so one role can arrive
  // under several keys ("Sales User" and "salesuser"). Sum them into one slice.
  const merged = new Map<string, number>();

  for (const [role, value] of Object.entries(roles)) {
    if (value <= 0) continue;
    const key = normalizeRole(role);
    merged.set(key, (merged.get(key) ?? 0) + value);
  }

  return [...merged.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([key, value]) => ({
      label: formatRoleLabel(key),
      value,
      color: roleColor(key),
    }));
}

export default function AdminTotalUsersCard() {
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const response = await fetch(`${API}/api/dashboard/admin/metrics`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        setMetrics(result.data ?? null);
      } catch (err) {
        console.error('Failed to load admin user metrics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, []);

  const userRoleSlices = buildUserRoleSlices(metrics?.user_roles);
  const totalUsers = metrics?.total_users ?? 0;

  return (
    <div className="stat-card">
      <div className="stat-card__top">
        <div className="stat-card__left">
          <div className="stat-card__iconWrap">
            <Users size={18} color="var(--c-chart-2)" />
          </div>
          <div className="stat-card__title">Total Users</div>
        </div>
        <div className="stat-card__tag">Users</div>
      </div>

      {loading ? (
        <>
          <div className="stat-card__value">...</div>
          <div className="stat-card__hint">Loading user distribution</div>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 12 }}>
          <DonutChart
            slices={userRoleSlices}
            size={132}
            thickness={8}
            centerValue={formatNumber(totalUsers)}
            centerLabel="users"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            {userRoleSlices.length > 0 ? (
              userRoleSlices.map((slice) => (
                <DonutLegendRow
                  key={slice.label}
                  color={slice.color}
                  label={slice.label}
                  value={slice.value}
                />
              ))
            ) : (
              <div className="stat-card__hint">No users found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
