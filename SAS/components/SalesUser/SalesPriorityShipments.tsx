import { MoreVertical } from 'lucide-react';
import SalesStatusPill from '@/components/SalesUser/SalesStatusPill';
import '@/styles/SalesStyles/SalesPriorityShipments.css';

const rows = [
  {
    id: '#DGL-8921',
    initials: 'AM',
    client: 'Acme Manufacturing',
    destination: 'Hamburg, DE',
    eta: 'Oct 24, 2023',
    status: { label: 'In Transit', tone: 'blue' as const },
  },
  {
    id: '#DGL-8944',
    initials: 'GS',
    client: 'Global Supplies Inc.',
    destination: 'Singapore, SG',
    eta: 'Oct 26, 2023',
    status: { label: 'Arrived at Port', tone: 'purple' as const },
  },
  {
    id: '#DGL-8820',
    initials: 'TR',
    client: 'Tech Retailers',
    destination: 'San Francisco, US',
    eta: 'Nov 02, 2023',
    status: { label: 'Processing', tone: 'amber' as const },
  },
];

export default function SalesPriorityShipments() {
  return (
    <div className="sales-tableCard">
      <div className="sales-tableWrap">
        <table className="sales-table">
          <thead>
            <tr>
              <th>SHIPMENT ID</th>
              <th>CLIENT</th>
              <th>DESTINATION</th>
              <th>ETA</th>
              <th>STATUS</th>
              <th className="text-right">ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="sales-strong">{r.id}</td>

                <td>
                  <div className="sales-client">
                    <span className="sales-avatar">{r.initials}</span>
                    <span className="sales-clientName">{r.client}</span>
                  </div>
                </td>

                <td className="sales-muted">{r.destination}</td>
                <td className="sales-strong">{r.eta}</td>

                <td>
                  <SalesStatusPill label={r.status.label} tone={r.status.tone} />
                </td>

                <td className="sales-actions">
                  <button className="sales-moreBtn" type="button">
                    <MoreVertical className="sales-moreIcon" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}