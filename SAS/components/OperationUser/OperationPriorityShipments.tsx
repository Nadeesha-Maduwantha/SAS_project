"use client";

import { useEffect, useState } from "react";
import '@/styles/OperationStyles/OperationPriorityShipments.css';
import { apiUrl } from '@/lib/api';

type Shipment = {
  cargo_id: string;
  lane: string;
  stage: string;
  transport_mode: string;
  pickup_status: string;
};

export default function OperationPriorityShipments() {
  const [rows, setRows] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/api/dashboard/operation/shipment"))
      .then((res) => res.json())
      .then((data) => {
        setRows(data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching shipments:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="op-tableCard">
      <div className="op-tableHead">
        <h2 className="op-tableTitle">Priority Shipments</h2>
      </div>

      <div className="op-tableWrap">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="op-table">
            <thead>
              <tr>
                <th>SHIPMENT ID</th>
                <th>LANE</th>
                <th>STAGE</th>
                <th>MODE</th>
                <th>STATUS</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, index) => (
                <tr key={index}>
                  <td className="op-strong">{r.cargo_id}</td>
                  <td>{r.lane}</td>
                  <td>{r.stage}</td>
                  <td>{r.transport_mode}</td>
                  <td>{r.pickup_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}