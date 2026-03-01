'use client';

import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import '@/styles/AdminStyles/ShipmentFeed.css';

type ShipmentStatus =
  | 'In Transit'
  | 'Customs Hold'
  | 'Arrived at Port'
  | 'Processing'
  | 'Delivered';

type ShipmentDept = 'Air Freight' | 'Sea Freight' | 'Road Freight';

type ShipmentRow = {
  id: string;
  origin: string;
  dest: string;
  dept: ShipmentDept;
  status: ShipmentStatus;
  lead: string;
};

const statusClass: Record<ShipmentStatus, string> = {
  'In Transit': 'status--green',
  'Customs Hold': 'status--amber',
  'Arrived at Port': 'status--blue',
  Processing: 'status--purple',
  Delivered: 'status--gray',
};

type FilterType = 'department' | 'status';

export default function ShipmentFeed() {
  const [openFilter, setOpenFilter] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [filterType, setFilterType] = useState<FilterType>('department');
  const [deptValue, setDeptValue] = useState<string>('All');
  const [statusValue, setStatusValue] = useState<string>('All');

  const rows: ShipmentRow[] = [
    { id: '#DGL-82910', origin: 'Colombo (CMB)', dest: 'Singapore (SIN)', dept: 'Sea Freight', status: 'In Transit', lead: 'S. Perera' },
    { id: '#DGL-82911', origin: 'Dubai (DXB)', dest: 'London (LHR)', dept: 'Air Freight', status: 'Customs Hold', lead: 'M. Ahmed' },
    { id: '#DGL-82912', origin: 'Chennai (MAA)', dest: 'Hamburg (HAM)', dept: 'Road Freight', status: 'Arrived at Port', lead: 'K. Kumar' },
    { id: '#DGL-82913', origin: 'Shanghai (PVG)', dest: 'Los Angeles (LAX)', dept: 'Sea Freight', status: 'Processing', lead: 'T. Silva' },
    { id: '#DGL-82914', origin: 'Bangkok (BKK)', dest: 'Frankfurt (FRA)', dept: 'Air Freight', status: 'Delivered', lead: 'N. Fernando' },
    { id: '#DGL-82915', origin: 'Mumbai (BOM)', dest: 'Dubai (DXB)', dept: 'Road Freight', status: 'In Transit', lead: 'R. Khan' },
    { id: '#DGL-82916', origin: 'Jakarta (CGK)', dest: 'Tokyo (NRT)', dept: 'Sea Freight', status: 'Customs Hold', lead: 'A. Wijesinghe' },
    { id: '#DGL-82917', origin: 'Doha (DOH)', dest: 'Paris (CDG)', dept: 'Air Freight', status: 'Processing', lead: 'L. Smith' },
    { id: '#DGL-82918', origin: 'Karachi (KHI)', dest: 'Colombo (CMB)', dept: 'Road Freight', status: 'Delivered', lead: 'P. Jayawardena' },
    { id: '#DGL-82919', origin: 'Busan (PUS)', dest: 'Rotterdam (RTM)', dept: 'Sea Freight', status: 'Arrived at Port', lead: 'D. Tanaka' },
  ];

  const isFiltering = deptValue !== 'All' || statusValue !== 'All';

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterType === 'department') {
        return deptValue === 'All' ? true : r.dept === deptValue;
      }
      return statusValue === 'All' ? true : r.status === statusValue;
    });
  }, [rows, filterType, deptValue, statusValue]);

  const displayedRows =
    isFiltering || showAll
      ? filteredRows
      : filteredRows.slice(0, 5);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const clearFilter = () => {
    setDeptValue('All');
    setStatusValue('All');
    setOpenFilter(false);
    setShowAll(false);
  };

  // ✅ SMART EXPORT
  const exportToCSV = () => {
    let dataToExport: ShipmentRow[] = [];

    if (selectedIds.length > 0) {
      dataToExport = rows.filter((r) =>
        selectedIds.includes(r.id)
      );
    } else if (isFiltering) {
      dataToExport = filteredRows;
    } else {
      dataToExport = rows;
    }

    const headers = [
      'Shipment ID',
      'Origin',
      'Destination',
      'Department',
      'Status',
      'Current Lead',
    ];

    const csvRows = [
      headers.join(','),
      ...dataToExport.map((row) =>
        [
          row.id,
          row.origin,
          row.dest,
          row.dept,
          row.status,
          row.lead,
        ].join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shipments_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="shipment-card">
      <div className="shipment-card__head">
        <div className="shipment-card__titleRow">
          <div className="shipment-card__title">
            Admin Shipment Feed
          </div>
        </div>

        <div className="shipment-card__actions">
          {openFilter && (
  <div className="shipment-filterPop">
    <div className="shipment-filterPop__top">
      <div className="shipment-filterPop__title">Filter by</div>
      <button
        className="shipment-filterPop__clear"
        onClick={clearFilter}
        type="button"
      >
        Clear
      </button>
    </div>

    <div className="shipment-filterPop__chips">
      <button
        type="button"
        className={`shipment-filterChip ${
          filterType === 'department' ? 'active' : ''
        }`}
        onClick={() => {
          setFilterType('department');
          setStatusValue('All');
        }}
      >
        Department
      </button>

      <button
        type="button"
        className={`shipment-filterChip ${
          filterType === 'status' ? 'active' : ''
        }`}
        onClick={() => {
          setFilterType('status');
          setDeptValue('All');
        }}
      >
        Current Status
      </button>
    </div>

    {filterType === 'department' ? (
      <div className="shipment-filterPop__group">
        <label>Department</label>
        <select
          value={deptValue}
          onChange={(e) => setDeptValue(e.target.value)}
        >
          <option>All</option>
          <option>Air Freight</option>
          <option>Sea Freight</option>
          <option>Road Freight</option>
        </select>
      </div>
    ) : (
      <div className="shipment-filterPop__group">
        <label>Status</label>
        <select
          value={statusValue}
          onChange={(e) => setStatusValue(e.target.value)}
        >
          <option>All</option>
          <option>In Transit</option>
          <option>Customs Hold</option>
          <option>Arrived at Port</option>
          <option>Processing</option>
          <option>Delivered</option>
        </select>
      </div>
    )}

    <button
      className="shipment-filterPop__done"
      onClick={() => setOpenFilter(false)}
      type="button"
    >
      Done
    </button>
  </div>
)}
          <button
  className="shipment-btn shipment-btn--ghost"
  onClick={() => setOpenFilter((prev) => !prev)}
  type="button"
>
  Filter
</button>

          <button
            className="shipment-btn shipment-btn--primary"
            onClick={exportToCSV}
          >
            {selectedIds.length > 0
              ? `Export Selected (${selectedIds.length})`
              : isFiltering
              ? `Export Filtered (${filteredRows.length})`
              : 'Export All'}
          </button>
        </div>
      </div>

      <div className="shipment-tableWrap">
        <table className="shipment-table">
          <thead>
            <tr>
              <th></th>
              <th>Shipment ID</th>
              <th>Origin / Dest</th>
              <th>Department</th>
              <th>Status</th>
              <th>Current Lead</th>
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((r) => (
              <tr key={r.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(r.id)}
                    onChange={() => toggleSelect(r.id)}
                  />
                </td>
                <td className="shipment-id">{r.id}</td>
                <td>
                  <div className="shipment-od__main">
                    {r.origin}
                  </div>
                  <div className="shipment-od__sub">
                    <ArrowRight className="shipment-od__icon" />
                    {r.dest}
                  </div>
                </td>
                <td className="shipment-muted">
                  {r.dept}
                </td>
                <td>
                  <span
                    className={`status-pill ${statusClass[r.status]}`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="shipment-muted">
                  {r.lead}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isFiltering && filteredRows.length > 5 && (
        <div className="shipment-card__footer">
          <button
            className="shipment-viewAll"
            onClick={() => setShowAll((p) => !p)}
          >
            {showAll ? 'Show Less' : 'View All'}
          </button>
        </div>
      )}

      {isFiltering && (
        <div className="shipment-card__footer">
          <button className="shipment-viewAll">
            View {filteredRows.length} Shipments
          </button>
        </div>
      )}
    </div>
  );
}