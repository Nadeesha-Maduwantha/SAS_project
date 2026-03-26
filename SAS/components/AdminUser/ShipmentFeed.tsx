import { ArrowRight } from 'lucide-react';
import '@/styles/AdminStyles/ShipmentFeed.css';

type ShipmentRow = {
  id: string;
  origin: string;
  dest: string;
  dept: string;
  status: 'In Transit' | 'Customs' | 'Hold' | 'Arrived';
  lead: string;
};

const statusClass: Record<ShipmentRow['status'], string> = {
  'In Transit': 'status--green',
  Customs: 'status--amber',
  Hold: 'status--red',
  Arrived: 'status--blue',
};

export default function ShipmentFeed() {
  const rows: ShipmentRow[] = [
    { id: '#DGL-82910', origin: 'Colombo (CMB)', dest: 'Singapore (SIN)', dept: 'Ocean Freight', status: 'In Transit', lead: 'S. Perera' },
    { id: '#DGL-82911', origin: 'Dubai (DXB)', dest: 'London (LHR)', dept: 'Air Export', status: 'Customs', lead: 'M. Ahmed' },
    { id: '#DGL-82912', origin: 'Chennai (MAA)', dest: 'Hamburg (HAM)', dept: 'LCL Consol', status: 'Arrived', lead: 'K. Kumar' },
  ];

  return (
    <div className="shipment-card">
      <div className="shipment-card__head">
        <div>
          <div className="shipment-card__titleRow">
            <div className="shipment-card__title">Admin Shipment Feed</div>
            <span className="shipment-card__pill">Global View</span>
          </div>
          <div className="shipment-card__sub">
            Consolidated feed across all departments and branch nodes
          </div>
        </div>

        <div className="shipment-card__actions">
          <button className="shipment-btn shipment-btn--ghost">Filter</button>
          <button className="shipment-btn shipment-btn--primary">Export All</button>
        </div>
      </div>

      <div className="shipment-tableWrap">
        <table className="shipment-table">
          <thead>
            <tr>
              <th>Shipment ID</th>
              <th>Origin / Dest</th>
              <th>Department</th>
              <th>Status</th>
              <th>Current Lead</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="shipment-id">{r.id}</td>
                <td>
                  <div className="shipment-od__main">{r.origin}</div>
                  <div className="shipment-od__sub">
                    <ArrowRight className="shipment-od__icon" />
                    {r.dest}
                  </div>
                </td>
                <td className="shipment-muted">{r.dept}</td>
                <td>
                  <span className={`status-pill ${statusClass[r.status]}`}>{r.status}</span>
                </td>
                <td className="shipment-muted">{r.lead}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="shipment-card__footer">
        <button className="shipment-viewAll">View All 4,282 Shipments</button>
      </div>
    </div>
  );
}