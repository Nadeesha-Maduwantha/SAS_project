import '@/styles/AdminStyles/SystemTechnicalLogs.css';

export default function SystemTechnicalLogs() {
  const lines = [
    '[14:25:01] INFO: initiating carrier API poll...',
    '[14:25:03] WARN: rate limited (429) - retrying...',
    '[14:25:04] OK: webhook ack received for DGL-82910',
    '[14:25:08] SUCCESS: SLA deviation computed (ship: 82911)',
    '[14:25:10] ERROR: SMTP relay timeout (retry queued)',
  ];

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

      <div className="sys-metrics">
        <div className="sys-metric">
          <div className="sys-metric__label">ETA SUCCESS</div>
          <div className="sys-metric__value">99.1%</div>
          <div className="sys-metric__hint">SMTP relay: Active</div>
        </div>

        <div className="sys-metric">
          <div className="sys-metric__label">API ERRORS</div>
          <div className="sys-metric__value">0.02%</div>
          <div className="sys-metric__hint">Avg latency: 428ms</div>
        </div>
      </div>
    </div>
  );
}