'use client';

import { useMemo, useState } from 'react';
import { Search, MoreVertical } from 'lucide-react';
import '@/styles/SuperStyles/SuperRecentActivityTable.css';

type Row = {
  id: string;
  route: string;
  manager: string;
  status: string;
  tone: 'blue' | 'red' | 'green' | 'amber' | 'gray';
  etd: string; // e.g. "Oct 28, 2023"
};

type Props = {
  dateRange?: { from: string; to: string }; // YYYY-MM-DD (empty strings allowed)
};

const rows: Row[] = [
  { id: '#US-99021', route: 'NYC → LDN', manager: 'John Doe', status: 'In Transit', tone: 'blue', etd: 'Oct 28, 2023' },
  { id: '#CN-88123', route: 'SHG → LAX', manager: 'Sarah Chen', status: 'Customs Hold', tone: 'red', etd: 'Oct 25, 2023' },
  { id: '#DE-11029', route: 'BER → PAR', manager: 'Marc Weber', status: 'Arrived at Port', tone: 'green', etd: 'Oct 29, 2023' },
  { id: '#FR-44201', route: 'LYO → MAD', manager: 'Ana Lopez', status: 'Processing', tone: 'amber', etd: 'Oct 30, 2023' },
  { id: '#JP-22091', route: 'TYO → SYD', manager: 'Ken Tanaka', status: 'Delivered', tone: 'gray', etd: 'Oct 22, 2023' },

  { id: '#JP-77432', route: 'TOK → SYD', manager: 'Kenji Tanaka', status: 'In Transit', tone: 'blue', etd: 'Nov 02, 2023' },
  { id: '#IN-56318', route: 'MUM → DXB', manager: 'Priya Sharma', status: 'Delayed', tone: 'red', etd: 'Nov 01, 2023' },
  { id: '#UK-90877', route: 'LON → AMS', manager: 'Oliver Smith', status: 'Delivered', tone: 'green', etd: 'Oct 31, 2023' },
  { id: '#AU-33210', route: 'MEL → SIN', manager: 'Liam Brown', status: 'Processing', tone: 'amber', etd: 'Nov 03, 2023' },
  { id: '#CA-44789', route: 'TOR → NYC', manager: 'Emily Clark', status: 'Awaiting Pickup', tone: 'blue', etd: 'Nov 04, 2023' },
];

function parseETD(etd: string) {
  const d = new Date(etd);
  return isNaN(d.getTime()) ? null : d;
}

function parseYMD(ymd: string) {
  if (!ymd) return null;
  const d = new Date(`${ymd}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

export default function SuperRecentActivityTable({ dateRange }: Props) {
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(false);

  const isFilteringByDate = !!(dateRange?.from && dateRange?.to);

  const filteredRows = useMemo(() => {
    const query = q.trim().toLowerCase();

    const fromDate = dateRange?.from ? parseYMD(dateRange.from) : null;
    const toDate = dateRange?.to ? parseYMD(dateRange.to) : null;

    return rows.filter((r) => {
      // search filter
      const matchesQuery =
        !query ||
        r.id.toLowerCase().includes(query) ||
        r.route.toLowerCase().includes(query) ||
        r.manager.toLowerCase().includes(query) ||
        r.status.toLowerCase().includes(query) ||
        r.etd.toLowerCase().includes(query);

      if (!matchesQuery) return false;

      // date range filter (ETD)
      if (!fromDate && !toDate) return true;

      const etdDate = parseETD(r.etd);
      if (!etdDate) return false;

      const etdMid = new Date(etdDate.getFullYear(), etdDate.getMonth(), etdDate.getDate());

      if (fromDate && etdMid < fromDate) return false;

      if (toDate) {
        const toMid = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
        if (etdMid > toMid) return false;
      }

      return true;
    });
  }, [q, dateRange]);

  // ✅ what to show in table
  const displayedRows = useMemo(() => {
    // if filtering by date OR user clicked load more => show all filtered
    if (isFilteringByDate || showAll) return filteredRows;

    // default => show first 5
    return filteredRows.slice(0, 5);
  }, [filteredRows, isFilteringByDate, showAll]);

  // ✅ if date filter is cleared, go back to normal view
  // (your header sends from/to = '' on clear)
  // This keeps UX clean.
  useMemo(() => {
    if (!isFilteringByDate) setShowAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFilteringByDate]);

  return (
    <div className="ra-card">
      <div className="ra-head">
        <h2 className="ra-title">Recent Department Activity</h2>

        <div className="ra-search">
          <Search className="ra-search__icon" />
          <input
            className="ra-search__input"
            placeholder="Search shipments..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
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
            {displayedRows.map((r) => (
              <tr key={r.id}>
                <td className="ra-strong">{r.id}</td>
                <td className="ra-muted">{r.route}</td>
                <td className="ra-manager">
                  <span className="ra-avatar">
                    {r.manager
                      .split(' ')
                      .map((x) => x[0])
                      .join('')}
                  </span>
                  <span className="ra-muted">{r.manager}</span>
                </td>
                <td>
                  <span className={`ra-pill ra-pill--${r.tone}`}>{r.status}</span>
                </td>
                <td className="ra-muted">{r.etd}</td>
                <td className="ra-more">
                  <button className="ra-moreBtn" type="button">
                    <MoreVertical className="ra-moreIcon" />
                  </button>
                </td>
              </tr>
            ))}

            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={6} className="ra-muted" style={{ padding: '18px' }}>
                  No shipments found for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer button behavior */}
      {!isFilteringByDate ? (
        filteredRows.length > 5 && (
          <button
            className="ra-load"
            type="button"
            onClick={() => setShowAll((p) => !p)}
          >
            {showAll ? 'Show Less' : 'Load More Records'}
          </button>
        )
      ) : (
        <button className="ra-load" type="button">
          View {filteredRows.length} Activities
        </button>
      )}
    </div>
  );
}