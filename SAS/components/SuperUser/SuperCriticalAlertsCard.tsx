"use client";

import { useEffect, useState } from 'react';
import '@/styles/SuperStyles/SuperCriticalAlertsCard.css';

type CriticalAlert = {
  shipment: string | null;
  milestone: string | null;
  note: string | null;
};

const tones = ['red'];

export default function SuperCriticalAlertsCard() {
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [loading, setLoading] = useState(true);

  //  fetch function
  const fetchAlerts = () => {
    fetch('http://127.0.0.1:5001/api/dashboard/super/critical-alerts')
      .then((res) => res.json())
      .then((res) => {
        setAlerts(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAlerts(); // initial load

    // AUTO REFRESH EVERY 5 SECONDS
    const interval = setInterval(() => {
      fetchAlerts();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="ca-card">
      <div className="ca-head">
        <h2 className="ca-title">Critical Alerts</h2>
      </div>

      <div className="ca-list">
        {loading ? (
          <div className="ca-empty">Loading...</div>
        ) : alerts.length === 0 ? (
          <div className="ca-empty">No critical alerts</div>
        ) : (
          alerts.map((a, index) => (
            <div
              key={`${a.shipment}-${a.milestone}-${index}`}
              className={`ca-item ca-item--${tones[index % tones.length]}`}
            >
              <div>
                <div className="ca-item__t">
                  {a.shipment ? `Shipment ${a.shipment}` : 'Critical Shipment'}
                </div>

                <div className="ca-item__d">
                  {a.milestone || "Unknown milestone"}
                  {a.note ? ` - ${a.note}` : ''}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}