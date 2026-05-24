"use client";

import { useEffect, useState } from "react";
import { MoreVertical } from 'lucide-react';
import SalesStatusPill from '@/components/SalesUser/SalesStatusPill';
import '@/styles/SalesStyles/SalesPriorityShipments.css';

type Shipment = {
  cargo_id: string;
  lane: string;
  stage: string;
  transport_mode: string;
  pickup_status: string;
};

export default function SalesPriorityShipments() {

  const [rows, setRows] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:5001/api/dashboard/sales/shipment")
      .then(res => res.json())
      .then(data => {
        setRows(data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="sales-tableCard">
      <div className="sales-tableWrap">

        {loading ? (
          <p className="sales-loading">Loading...</p>
        ) : (
          <table className="sales-table">
            <thead>
              <tr>
                <th>SHIPMENT ID</th>
                <th>LANE</th>
                <th>STAGE</th>
                <th>MODE</th>
                <th>STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, index) => (
                <tr key={index}>
                  <td className="sales-strong">{r.cargo_id}</td>

                  <td className="sales-muted">{r.lane}</td>

                  <td>{r.stage}</td>

                  <td>{r.transport_mode}</td>

                  <td>
                    <SalesStatusPill 
                      label={r.pickup_status || "Unknown"} 
                      tone={mapStatusToTone(r.pickup_status)} 
                    />
                  </td>

                  <td className="sales-actions">
                    <button className="sales-moreBtn">
                      <MoreVertical className="sales-moreIcon" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>
    </div>
  );
}

/* 🔧 STATUS → COLOR MAP */
function mapStatusToTone(status?: string) {
  if (!status) return "blue";

  const s = status.toLowerCase();

  if (s.includes("delay") || s.includes("overdue")) return "red";
  if (s.includes("transit")) return "blue";
  if (s.includes("process")) return "amber";
  if (s.includes("arrive")) return "purple";

  return "blue";
}