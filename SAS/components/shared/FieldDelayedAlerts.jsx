"use client";

// =============================================================
//  FieldDelayedAlerts — yellow cards for "expected data field
//  delayed / possibly renamed". A milestone's expected CargoWise
//  field hasn't arrived and it's overdue OR a later milestone's
//  data already came. Admin should check if it arrived as another
//  name. Shows on the dashboard and the Field Registry page.
// =============================================================

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import { T } from "@/styles/tokens";

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function FieldDelayedAlerts({ compact = false }) {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/field-watch/alerts`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setItems(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || items.length === 0) return null; // stay quiet when nothing's wrong

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={16} color={T.amber} />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: T.gray900, margin: 0 }}>
            Expected data not arrived <span style={{ color: T.amber }}>({items.length})</span>
          </h2>
        </div>
        <button onClick={load} title="Refresh"
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBorder}`, fontFamily: T.font }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))", gap: 10 }}>
        {items.map((a) => (
          <div key={a.id}
            style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}`, borderLeft: `3px solid ${T.amber}`, borderRadius: 10, padding: "13px 15px", fontFamily: T.font }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
              <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.gray900 }}>
                #{a.job_number || a.shipment_id?.slice(0, 8)}
              </span>
              {a.is_critical && (
                <span style={{ fontSize: 9, fontWeight: 700, color: T.red, background: T.redBg, border: `1px solid ${T.redBorder}`, padding: "1px 6px", borderRadius: 4 }}>CRITICAL</span>
              )}
              <span style={{ fontSize: 9, fontWeight: 700, color: T.amber, background: "#fff", border: `1px solid ${T.amberBorder}`, padding: "1px 6px", borderRadius: 4 }}>
                {a.reason === "out_of_sequence" ? "OUT OF ORDER" : "OVERDUE"}
              </span>
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: T.gray900, marginBottom: 4 }}>{a.milestone_name}</div>

            <div style={{ fontSize: 12, color: T.gray700, lineHeight: 1.5 }}>
              Expected field <strong style={{ fontFamily: T.mono, color: "#92400E" }}>{a.expected_field || "—"}</strong> hasn&apos;t arrived.
              {a.suggested_field ? (
                <> It may have arrived as <strong style={{ fontFamily: T.mono, color: T.blue }}>{a.suggested_field}</strong>
                  {a.score != null && <span style={{ color: T.gray400 }}> ({Math.round(a.score * 100)}% match)</span>}.</>
              ) : (
                <> Check whether it came under a different name.</>
              )}
            </div>

            <button onClick={() => router.push("/admin/field_registry")}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 9, padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "#fff", color: T.blue, border: `1px solid ${T.blueBorder}`, fontFamily: T.font }}>
              Map it in Field Registry <ArrowRight size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
