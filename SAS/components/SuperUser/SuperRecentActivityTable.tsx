"use client";

import { useEffect, useState } from "react";
import '@/styles/SuperStyles/SuperRecentActivityTable.css';

type Row = {
  shipment: string;
  client: string;
  milestone: string;
  status: string;
  due_date: string;
};

export default function SuperRecentActivityTable() {

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 fetch function (NO FILTER)
  const fetchData = () => {
    setLoading(true);

    fetch("http://127.0.0.1:5000/api/dashboard/super/recent-activity")
      .then(res => res.json())
      .then(res => {
        setRows(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  // 🚀 initial load
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="super-table-card">

      {/* HEADER */}
      <div className="super-table-header">
        <h3>Recent Department Activity</h3>
      </div>

      {/* TABLE */}
      <div className="super-table-wrapper">
        <table className="super-table">
          <thead>
            <tr>
              <th>Shipment</th>
              <th>Client</th>
              <th>Current Milestone</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="super-loading">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="super-empty">
                  No data found
                </td>
              </tr>
            ) : (
              rows.map((r, index) => (
                <tr key={index}>
                  <td>{r.shipment}</td>
                  <td>{r.client}</td>
                  <td>{r.milestone}</td>

                  {/* STATUS STYLE */}
                  <td>
                    <span className={`status-badge status-${r.status.toLowerCase()}`}>
                      {r.status}
                    </span>
                  </td>

                  <td>{formatDate(r.due_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* 🔧 DATE FORMAT FUNCTION */
function formatDate(date: string) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
}