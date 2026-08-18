'use client';

import { useEffect, useState } from 'react';
import '@/styles/AdminStyles/ProgressLogs.css';

type Row = { time: string; user: string; action: string; resource: string };

const fallbackRows: Row[] = [
  { time: '14:22:15', user: 'sarah.j', action: 'MILESTONE UPDATE', resource: '#DGL-82910' },
  { time: '14:20:02', user: 'mike.c', action: 'DOC UPLOAD', resource: 'INV-8902' },
  { time: '14:18:55', user: 'admin_root', action: 'CONFIG CHANGE', resource: 'AUTH_SECRET' },
];

export default function ProgressLogs() {
  const [rows, setRows] = useState<Row[]>(fallbackRows);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const fetchLatestRows = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5001';
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
            const userName = typeof entry.user === 'object' ? (entry.user?.name ?? 'System') : (entry.user ?? 'System');
            const userValue = String(userName).trim() || 'System';
            const action = String(entry.action ?? 'UPDATE').toUpperCase();
            const resource = String(entry.resource ?? entry.module ?? entry.details ?? 'System');

            const timestamp = typeof entry.timestamp === 'string' ? entry.timestamp : '';
            const time = timestamp.includes(' ') ? timestamp.split(' ').slice(-1)[0] : timestamp;

            return {
              time: time || '00:00:00',
              user: userValue,
              action,
              resource,
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
              <th>Action Type</th>
              <th>Resource</th>
            </tr>
          </thead>
          <tbody>
            {(isLoading ? fallbackRows : rows).map((r, i) => (
              <tr key={`${r.time}-${r.user}-${i}`}>
                <td className="logs-muted">{r.time}</td>
                <td className="logs-strong">{r.user}</td>
                <td>
                  <span className="logs-pill">{r.action}</span>
                </td>
                <td className="logs-muted">{r.resource}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}