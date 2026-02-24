import { Search } from 'lucide-react';
import '@/styles/OperationStyles/OperationPriorityShipments.css';

const rows = [
  {
    id: '#SHP-2024-001',
    sub: 'Container: CN-8291',
    origin: 'Shanghai, CN',
    dest: 'Los Angeles, US',
    status: { label: 'Delayed', tone: 'red' as const },
    eta: 'Oct 24, 2023',
    value: '$124,500',
  },
  {
    id: '#SHP-2024-002',
    sub: 'Container: CN-1123',
    origin: 'Hamburg, DE',
    dest: 'New York, US',
    status: { label: 'Processing', tone: 'blue' as const },
    eta: 'Oct 26, 2023',
    value: '$45,200',
  },
  {
    id: '#SHP-2024-003',
    sub: 'Air Freight: AF-992',
    origin: 'Tokyo, JP',
    dest: 'London, UK',
    status: { label: 'In Transit', tone: 'purple' as const },
    eta: 'Oct 22, 2023',
    value: '$89,000',
  },
  {
    id: '#SHP-2024-004',
    sub: 'Container: CN-5541',
    origin: 'Singapore, SG',
    dest: 'Dubai, UAE',
    status: { label: 'Arrived', tone: 'green' as const },
    eta: 'Oct 20, 2023',
    value: '$210,000',
  },
];

export default function OperationPriorityShipments() {
  return (
    <div className="op-tableCard">
      <div className="op-tableHead">
        <div>
          <h2 className="op-tableTitle">Priority Shipments</h2>
          <p className="op-tableSub">Tasks requiring immediate attention</p>
        </div>

        <div className="op-tableSearch">
          <Search className="op-tableSearch__icon" />
          <input className="op-tableSearch__input" placeholder="Search ID..." />
        </div>
      </div>

      <div className="op-tableWrap">
        <table className="op-table">
          <thead>
            <tr>
              <th>SHIPMENT ID</th>
              <th>ORIGIN / DESTINATION</th>
              <th>STATUS</th>
              <th>ETA</th>
              <th>VALUE</th>
              <th className="text-right">ACTION</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="op-strong">{r.id}</div>
                  <div className="op-muted">{r.sub}</div>
                </td>

                <td>
                  <div className="op-strong">{r.origin}</div>
                  <div className="op-muted">to {r.dest}</div>
                </td>

                <td>
                  <span className={`op-pill op-pill--${r.status.tone}`}>
                    <span className={`op-pillDot op-pillDot--${r.status.tone}`} />
                    {r.status.label}
                  </span>
                </td>

                <td className="op-strong">{r.eta}</td>
                <td className="op-strong">{r.value}</td>

                <td className="op-action">
                  <button className="op-linkBtn" type="button">
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="op-tableFooter">
        <span className="op-muted">Showing 4 of 24 tasks</span>

        <div className="op-pager">
          <button className="op-pageBtn" type="button">Prev</button>
          <button className="op-pageBtn" type="button">Next</button>
        </div>
      </div>
    </div>
  );
}