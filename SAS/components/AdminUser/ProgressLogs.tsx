'use client';

// =============================================================
//  ProgressLogs.tsx
//  Path: components/AdminUser/ProgressLogs.tsx
//
//  The three newest audit_trail entries, on the admin dashboard.
//
//  /api/audit-trail/ is behind @require_auth and an admin role
//  check, so the access token has to go with the request — without
//  it the endpoint answers 401 and the card has nothing to show.
// =============================================================

import { useEffect, useState } from 'react';
import { formatTimestamp } from '@/components/AdminUser/AccessLogs/AccessLogsTable';
import { formatRoleLabel } from '@/lib/roles';
import { apiUrl, authHeaders } from '@/lib/api';
import '@/styles/AdminStyles/ProgressLogs.css';

type Row = { time: string; user: string; role: string; action: string };

const ROW_LIMIT = 3;

export default function ProgressLogs() {
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchLatestRows = async () => {
      try {
        const response = await fetch(apiUrl('/api/audit-trail/'), {
          headers: authHeaders(),
          cache: 'no-store',
          signal: controller.signal,
        });

        const json = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(json?.error ?? `HTTP ${response.status}`);
        }

        const latest = Array.isArray(json?.data) ? json.data.slice(0, ROW_LIMIT) : [];

        // The API sends `user` as { name, role }; older entries with no
        // matching profile arrive as the string 'System'.
        setRows(latest.map((entry: any) => {
          const isUserObject = typeof entry.user === 'object' && entry.user !== null;
          const userName = isUserObject ? (entry.user?.name ?? 'System') : (entry.user ?? 'System');
          const rawRole = isUserObject ? (entry.user?.role ?? '') : '';
          const timestamp = typeof entry.timestamp === 'string' ? entry.timestamp : '';

          return {
            time:   timestamp ? formatTimestamp(timestamp) : '—',
            user:   String(userName).trim() || 'System',
            role:   rawRole ? formatRoleLabel(String(rawRole)) : '—',
            action: String(entry.action ?? 'UPDATE').toUpperCase(),
          };
        }));
        setError(null);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error('ProgressLogs: failed to load the audit trail', err);
        // Showing sample rows here would read as real activity — say
        // nothing loaded instead.
        setRows([]);
        setError(err instanceof Error ? err.message : 'Could not load the audit trail');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestRows();

    return () => controller.abort();
  }, []);

  const message =
    isLoading ? 'Loading…'
    : error   ? error
    : rows.length === 0 ? 'No audit activity yet'
    : null;

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
            {message ? (
              <tr>
                <td colSpan={4} className={error ? 'logs-state logs-state--error' : 'logs-state'}>
                  {message}
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.time}-${r.user}-${i}`}>
                  <td className="logs-muted">{r.time}</td>
                  <td className="logs-strong">{r.user}</td>
                  <td className="logs-muted">{r.role}</td>
                  <td>
                    <span className="logs-pill">{r.action}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
