'use client';

import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import '@/styles/AdminStyles/ShipmentFeed.css';

// ========================================
// TYPES (KEEP SAME)
// ========================================

type ShipmentStage =
  | 'In Transit'
  | 'Customs Hold'
  | 'Arrived at Port'
  | 'Processing'
  | 'Delivery';

type TransportMode = 'Air' | 'Sea';

type PickupStatus = 'Delayed' | 'On Time' | 'Pending' | 'Completed';

type ShipmentRow = {
  id: string;
  branch: string;
  lane: string;
  origin: string;
  dest: string;
  stage: ShipmentStage;
  // stageDetails: string;
  transportMode: TransportMode;
  pickupStatus: PickupStatus;
};

// ========================================
// STATUS STYLING (KEEP SAME)
// ========================================

const stageClass: Record<ShipmentStage, string> = {
  'In Transit': 'status--green',
  'Customs Hold': 'status--amber',
  'Arrived at Port': 'status--blue',
  Processing: 'status--purple',
  Delivery: 'status--gray',
};

const pickupStatusClass: Record<PickupStatus, string> = {
  Delayed: 'status--amber',
  'On Time': 'status--green',
  Pending: 'status--blue',
  Completed: 'status--gray',
};

// ========================================
// COMPONENT (UPDATED ONLY HERE)
// ========================================

export default function ShipmentFeed({ data }: { data: any[] }) {
  const [openFilter, setOpenFilter] = useState(false);
  const [transportModeFilter, setTransportModeFilter] = useState<string>('All');

  // 🔥 CONVERT BACKEND DATA → YOUR UI FORMAT
  const rows: ShipmentRow[] = useMemo(() => {
    if (!data) return [];

    return data.map((item) => ({
      id: `#${item.cargo_id}`,
      branch: item.branch,
      origin: item.lane?.split('→')[0]?.trim() || '',
      dest: item.lane?.split('→')[1]?.trim() || '',
      lane: item.lane,
      stage: item.stage,
      // stageDetails: item.description,
      transportMode: item.transport_mode,
      pickupStatus: item.pickup_status,
    }));
  }, [data]);

  // ========================================
  // FILTER LOGIC (UNCHANGED)
  // ========================================

  const filteredRows = useMemo(() => {
  return rows.filter((r) => {
    if (transportModeFilter === 'All') return true;

    return (
      r.transportMode?.toLowerCase().trim() ===
      transportModeFilter.toLowerCase().trim()
    );
  });
}, [rows, transportModeFilter]);
  const displayedRows = filteredRows.slice(0, 5);

  const clearFilter = () => {
    setTransportModeFilter('All');
    setOpenFilter(false);
  };
  
  // ========================================
  // UI (UNCHANGED)
  // ========================================

  return (
    <div className="shipment-card">
      <div className="shipment-card__head">
        <div className="shipment-card__titleRow">
          <div className="shipment-card__title">Shipment Feed</div>
        </div>

        <div className="shipment-card__actions">
          {openFilter && (
            <div className="shipment-filterPop">
              <div className="shipment-filterPop__top">
                <div className="shipment-filterPop__title">Filter by</div>
                <button onClick={clearFilter}>Clear</button>
              </div>

              <div className="shipment-filterPop__group">
                <label>Transport Mode</label>
                <select
                  value={transportModeFilter}
                  onChange={(e) => setTransportModeFilter(e.target.value)}
                >
                  <option>All</option>
                  <option>Air</option>
                  <option>Sea</option>
                </select>
              </div>

              <button onClick={() => setOpenFilter(false)}>Done</button>
            </div>
          )}

          <button onClick={() => setOpenFilter((prev) => !prev)}>
            Filter
          </button>
        </div>
      </div>

      <div className="shipment-tableWrap">
        <table className="shipment-table">
          <thead>
            <tr>
              <th>Cargowise ID</th>
              <th>Shipment Lane</th>
              <th>Current Stage</th>
              <th>Transport Mode</th>
              <th>Pickup Status</th>
              <th>View Details</th>
            </tr>
          </thead>

          <tbody>
            {displayedRows.length > 0 ? (
              displayedRows.map((r, i) => (
                <tr key={i}>
                  <td>
                    <div className="shipment-id">{r.id}</div>
                    <div className="shipment-od__sub">
                      Branch: {r.branch}
                    </div>
                  </td>

                  <td>
                    <div className="shipment-od__main">{r.origin}</div>
                    <div className="shipment-od__sub">
                      <ArrowRight className="shipment-od__icon" />
                      {r.dest}
                    </div>
                  </td>

                  <td>
                    <span className={`status-pill ${stageClass[r.stage]}`}>
                      {r.stage}
                    </span>
                    {/* <div className="shipment-od__sub">
                      {r.stageDetails}
                    </div> */}
                  </td>

                  <td className="shipment-muted">{r.transportMode}</td>

                  <td>
                    <span
                      className={`status-pill ${pickupStatusClass[r.pickupStatus]}`}
                    >
                      {r.pickupStatus}
                    </span>
                  </td>

                  <td>
                    <button className="shipment-viewAll">
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>No data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}