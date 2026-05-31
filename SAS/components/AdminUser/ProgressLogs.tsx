import '@/styles/AdminStyles/ProgressLogs.css';

type Row = { time: string; user: string; action: string; location: string };

export default function ProgressLogs() {
  const rows: Row[] = [
    { time: '14:22:15', user: 'sarah.j', action: 'MILESTONE UPDATE', location: 'Sri Lanka-Colombo' },
    { time: '14:20:02', user: 'mike.c', action: 'DOC UPLOAD', location: 'Singapore' },
    { time: '14:18:55', user: 'admin_root', action: 'CONFIG CHANGE', location: 'Hong Kong' },
  ];

  return (
    <div className="logs-card">
      <div className="logs-card__head">
        <div>
          <div className="logs-card__title">Full Progress Logs</div>
          <div className="logs-card__sub">User attributions &amp; audit trail</div>
        </div>

        {/* <button className="logs-card__link">Live View</button> */}
      </div>

      <div className="logs-tableWrap">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action Type</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="logs-muted">{r.time}</td>
                <td className="logs-strong">{r.user}</td>
                <td>
                  <span className="logs-pill">{r.action}</span>
                </td>
                <td className="logs-muted">{r.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}