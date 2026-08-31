'use client';

import { useEffect, useState } from 'react';
import '@/styles/AdminStyles/SystemTechnicalLogs.css';

type TechnicalLogsData = {
  lines: string[];
  eta_success: number;
  api_error_rate: number;
  avg_latency_ms: number;
  smtp_relay: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';

export default function SystemTechnicalLogs() {
  const [data, setData] = useState<TechnicalLogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        setError(null);
        const response = await fetch(`${API}/api/dashboard/admin/technical-logs`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        setData(result.data ?? null);
      } catch (err) {
        console.error('Failed to load technical logs:', err);
        setError('Could not load technical logs');
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, []);

  const lines = loading
    ? ['[--:--:--] INFO: loading backend technical logs...']
    : data?.lines?.length
      ? data.lines
      : ['[--:--:--] INFO: no technical logs found'];

  return (
    <div className="sys-card">
      <div className="sys-card__title">System Technical Logs</div>
      <div className="sys-card__sub">Backend errors &amp; delivery metrics</div>

      <div className="sys-terminal">
        {lines.map((l, idx) => (
          <div key={idx} className="sys-line">
            {l}
          </div>
        ))}
      </div>

      {error ? <div className="sys-error">{error}</div> : null}

      <div className="sys-metrics">
        <div className="sys-metric">
          <div className="sys-metric__label">ETA SUCCESS</div>
          <div className="sys-metric__value">
            {loading ? '...' : `${data?.eta_success ?? 0}%`}
          </div>
          <div className="sys-metric__hint">SMTP relay: {data?.smtp_relay ?? '—'}</div>
        </div>

        <div className="sys-metric">
          <div className="sys-metric__label">API ERRORS</div>
          <div className="sys-metric__value">
            {loading ? '...' : `${data?.api_error_rate ?? 0}%`}
          </div>
          <div className="sys-metric__hint">Avg latency: {data?.avg_latency_ms ?? 0}ms</div>
        </div>
      </div>
    </div>
  );
}
