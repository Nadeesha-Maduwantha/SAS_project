import { Search, MoreVertical } from 'lucide-react';
import '@/styles/SuperStyles/SuperRecentActivityTable.css';

const rows = [
  { id: '#US-99021', route: 'NYC → LDN', manager: 'John Doe', status: 'In Transit', tone: 'blue', etd: 'Oct 28, 2023' },
  { id: '#CN-88123', route: 'SHG → LAX', manager: 'Sarah Chen', status: 'Customs Hold', tone: 'red', etd: 'Oct 25, 2023' },
  { id: '#DE-11029', route: 'BER → PAR', manager: 'Marc Weber', status: 'Arrived at Port', tone: 'green', etd: 'Oct 29, 2023' },
  { id: '#FR-44201', route: 'LYO → MAD', manager: 'Ana Lopez', status: 'Processing', tone: 'amber', etd: 'Oct 30, 2023' },
  { id: '#JP-22091', route: 'TYO → SYD', manager: 'Ken Tanaka', status: 'Delivered', tone: 'gray', etd: 'Oct 22, 2023' },
];

export default function SuperRecentActivityTable() {
  return (
    <div className="ra-card">
      <div className="ra-head">
        <h2 className="ra-title">Recent Department Activity</h2>

        <div className="ra-search">
          <Search className="ra-search__icon" />
          <input className="ra-search__input" placeholder="Search shipments..." />
        </div>
      </div>

      <div className="ra-tableWrap">
        <table className="ra-table">
          <thead>
            <tr>
              <th>Shipment ID</th>
              <th>Origin / Destination</th>
              <th>Manager</th>
              <th>Status</th>
              <th>ETD</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="ra-strong">{r.id}</td>
                <td className="ra-muted">{r.route}</td>
                <td className="ra-manager">
                  <span className="ra-avatar">{r.manager.split(' ').map(x => x[0]).join('')}</span>
                  <span className="ra-muted">{r.manager}</span>
                </td>
                <td>
                  <span className={`ra-pill ra-pill--${r.tone}`}>{r.status}</span>
                </td>
                <td className="ra-muted">{r.etd}</td>
                <td className="ra-more">
                  <button className="ra-moreBtn">
                    <MoreVertical className="ra-moreIcon" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="ra-load">Load More Records</button>
    </div>
  );
}