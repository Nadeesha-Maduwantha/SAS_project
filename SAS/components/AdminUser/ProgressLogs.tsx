'use client';

import { useEffect, useState } from 'react';
import { formatTimestamp } from '@/components/AdminUser/AccessLogs/AccessLogsTable';
import { formatRoleLabel } from '@/lib/roles';
import '@/styles/AdminStyles/ProgressLogs.css';

type Row = { time: string; user: string; role: string; action: string };

const fallbackRows: Row[] = [
  { time: '2026-8-28 3.28p.m', user: 'sarah.j',    role: 'Sales User',     action: 'MILESTONE UPDATE' },
  { time: '2026-8-28 3.27p.m', user: 'mike.c',     role: 'Operation User', action: 'DOC UPLOAD' },
  { time: '2026-8-28 3.03p.m', user: 'admin_root', role: 'Admin',          action: 'CONFIG CHANGE' },
];

export default function ProgressLogs() {
  const [rows, setRows] = useState<Row[]>(fallbackRows);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const fetchLatestRows = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';
        const response = await fetch(`${base}/api/audit-trail/`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Audit trail fetch failed');
        }

        const json = await response.json();
        const latest = Array.isArray(json?.data) ? json.data.slice(0, 3) : [];

        if (latest.length > 0) {
          const mapped: Row[] = latest.map((entry: any) => {
            const isUserObject = typeof entry.user === 'object' && entry.user !== null;
            const userName = isUserObject ? (entry.user?.name ?? 'System') : (entry.user ?? 'System');
            const userValue = String(userName).trim() || 'System';
            const rawRole = isUserObject ? (entry.user?.role ?? '') : '';
            const action = String(entry.action ?? 'UPDATE').toUpperCase();

            const timestamp = typeof entry.timestamp === 'string' ? entry.timestamp : '';

            return {
              time: timestamp ? formatTimestamp(timestamp) : '—',
              user: userValue,
              role: rawRole ? formatRoleLabel(String(rawRole)) : '—',
              action,
            };
          });

          setRows(mapped);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setRows(fallbackRows);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestRows();

    return () => controller.abort();
  }, []);

  return (
    <div className="logs-card">
      <div className="logs-card__head">
        <div>
          <div className="logs-card__title">Full Progress Logs</div>
          <div className="logs-card__sub">User attributions &amp; audit trail</div>
        </div>
      </div>

      <div className="logs-tableWrap">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Role</th>
              <th>Action Type</th>
            </tr>
          </thead>
          <tbody>
            {(isLoading ? fallbackRows : rows).map((r, i) => (
              <tr key={`${r.time}-${r.user}-${i}`}>
                <td className="logs-muted">{r.time}</td>
                <td className="logs-strong">{r.user}</td>
                <td className="logs-muted">{r.role}</td>
                <td>
                  <span className="logs-pill">{r.action}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}