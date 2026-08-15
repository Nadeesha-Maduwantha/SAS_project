"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────
interface Shipment {
  id: string;
  job_number?: string;
  consignee_name?: string;
  branch?: string;
  transport_mode?: string;
  origin_city?: string;
  origin_country_code?: string;
  destination_city?: string;
  destination_country_code?: string;
  current_stage?: string;
  carrier?: string;
  is_priority?: boolean;
  created_by_name?: string;
  sales_user_name?: string;
}

interface Milestone {
  id: string;
  shipment_id: string;
  name: string;
  status: "pending" | "overdue" | "completed" | string;
  due_date?: string;
  is_critical?: boolean;
  sequence_order?: number;
  assigned_to?: string;
  assigned_email?: string;
  alert_sent?: boolean;
}

interface ShipmentRow {
  shipment: Shipment;
  current_milestone: Milestone | null;
}

// ── Icons ─────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────
function buildRoute(s: Shipment): string {
  const origin = [s.origin_city, s.origin_country_code].filter(Boolean).join(", ");
  const dest   = [s.destination_city, s.destination_country_code].filter(Boolean).join(", ");
  if (!origin && !dest) return "—";
  if (!origin) return dest;
  if (!dest)   return origin;
  return `${origin} → ${dest}`;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pending:   { label: "Pending",   bg: "#F3F4F6", color: "#6B7280", border: "#D1D5DB" },
  overdue:   { label: "Overdue",   bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
  completed: { label: "Completed", bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },
};

// ── Page ──────────────────────────────────────────────────────
export default function CurrentMilestonePage() {
  const router = useRouter();

  const [data,    setData]    = useState<ShipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all");

  useEffect(() => {
    fetch("http://localhost:5000/api/shipments/current-milestones")
      .then(r => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`);
        return r.json();
      })
      .then(result => setData(result.data ?? []))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Filter + Search ────────────────────────────────────────
  const displayed = data.filter(row => {
    const s = row.shipment;
    const m = row.current_milestone;
    const q = search.toLowerCase();

    const matchSearch = !q || [
      s.job_number, s.consignee_name, s.branch,
      s.transport_mode, m?.name,
      buildRoute(s),
    ].some(v => (v ?? "").toLowerCase().includes(q));

    const matchFilter =
      filter === "all"     ? true :
      filter === "overdue" ? m?.status === "overdue" :
      filter === "pending" ? m?.status === "pending" :
      filter === "none"    ? !m :
      true;

    return matchSearch && matchFilter;
  });

  const overdueCount = data.filter(r => r.current_milestone?.status === "overdue").length;
  const pendingCount = data.filter(r => r.current_milestone?.status === "pending").length;
  const noneCount    = data.filter(r => !r.current_milestone).length;

  return (
    <div style={{
      minHeight: "100vh", background: "#F9FAFB",
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: "#111827", padding: "32px 32px 80px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; }
        table { border-collapse: collapse; width: 100%; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "21px", fontWeight: "700", letterSpacing: "-0.015em", marginBottom: "6px" }}>
          Current Milestones
        </h1>
        <p style={{ fontSize: "13px", color: "#6B7280" }}>
          Live view of each shipment's active milestone
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
        {[
          { label: "Total Shipments", value: data.length,  color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE", key: "all"     },
          { label: "Overdue",         value: overdueCount, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", key: "overdue" },
          { label: "Pending",         value: pendingCount, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", key: "pending" },
          { label: "No Milestone",    value: noneCount,    color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB", key: "none"    },
        ].map(card => (
          <div
            key={card.key}
            onClick={() => setFilter(f => f === card.key ? "all" : card.key)}
            style={{
              flex: "1", minWidth: "140px",
              background: filter === card.key ? card.bg : "#fff",
              border: `1px solid ${filter === card.key ? card.border : "#E5E7EB"}`,
              borderRadius: "12px", padding: "16px 20px",
              cursor: "pointer", transition: "all 0.15s",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
              {card.label}
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: filter === card.key ? card.color : "#111827" }}>
              {loading ? "..." : card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ fontSize: "13px", color: "#6B7280" }}>
          Showing <strong style={{ color: "#111827" }}>{displayed.length}</strong> of{" "}
          <strong style={{ color: "#111827" }}>{data.length}</strong> shipments
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: "#fff", border: "1px solid #E5E7EB",
          borderRadius: "8px", padding: "8px 14px", minWidth: "260px",
        }}>
          <SearchIcon />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search shipments, milestones..."
            style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px", color: "#374151", flex: 1, fontFamily: "inherit" }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: "#fff", border: "1px solid #E5E7EB",
        borderRadius: "14px", overflow: "hidden",
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                {["Shipment", "Client", "Route", "Mode", "Current Milestone", "Status", "Due Date", "Critical", ""].map(h => (
                  <th key={h} style={{
                    padding: "11px 16px", textAlign: "left",
                    fontSize: "11px", fontWeight: "600", color: "#6B7280",
                    letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                      <div style={{
                        width: "16px", height: "16px", borderRadius: "50%",
                        border: "2px solid #E5E7EB", borderTopColor: "#3B82F6",
                        animation: "spin 0.7s linear infinite",
                      }} />
                      <span style={{ fontSize: "13px", color: "#9CA3AF" }}>Loading shipments...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px 20px", color: "#DC2626", fontSize: "13px" }}>
                    ⚠ {error}
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "60px 20px", color: "#9CA3AF", fontSize: "13px" }}>
                    No shipments match your search.
                  </td>
                </tr>
              ) : (
                displayed.map(row => {
                  const s  = row.shipment;
                  const m  = row.current_milestone;
                  const st = m ? (STATUS_STYLE[m.status] ?? STATUS_STYLE.pending) : null;

                  return (
                    <tr
                      key={s.id}
                      style={{ borderBottom: "1px solid #F3F4F6", transition: "background 0.12s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Shipment ID */}
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: "12px", fontWeight: "600",
                          color: "#3B82F6", background: "#EFF6FF",
                          border: "1px solid #BFDBFE",
                          padding: "2px 8px", borderRadius: "4px",
                        }}>
                          {s.job_number ?? s.id.slice(0, 8)}
                        </span>
                      </td>

                      {/* Client */}
                      <td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: "500", color: "#111827", maxWidth: "160px" }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.consignee_name ?? "—"}
                        </div>
                      </td>

                      {/* Route */}
                      <td style={{ padding: "14px 16px", fontSize: "12px", color: "#6B7280", whiteSpace: "nowrap" }}>
                        {buildRoute(s)}
                      </td>

                      {/* Transport mode */}
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          fontSize: "11px", fontWeight: "600",
                          padding: "2px 8px", borderRadius: "4px",
                          background: s.transport_mode === "AIR" ? "#F0F9FF" : "#F0FDF4",
                          color:      s.transport_mode === "AIR" ? "#0369A1" : "#15803D",
                          border:     s.transport_mode === "AIR" ? "1px solid #BAE6FD" : "1px solid #BBF7D0",
                        }}>
                          {s.transport_mode ?? "—"}
                        </span>
                      </td>

                      {/* Current milestone name */}
                      <td style={{ padding: "14px 16px", fontSize: "13px", color: "#374151", maxWidth: "180px" }}>
                        {m ? (
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: "500" }}>
                            {m.name}
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#D1D5DB" }}>No milestone assigned</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 16px" }}>
                        {m && st ? (
                          <span style={{
                            fontSize: "11px", fontWeight: "600",
                            padding: "3px 9px", borderRadius: "5px",
                            background: st.bg, color: st.color,
                            border: `1px solid ${st.border}`,
                          }}>
                            {st.label}
                          </span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#D1D5DB" }}>—</span>
                        )}
                      </td>

                      {/* Due date */}
                      <td style={{ padding: "14px 16px", fontSize: "12px", color: "#6B7280", whiteSpace: "nowrap" }}>
                        {m ? formatDate(m.due_date) : "—"}
                      </td>

                      {/* Critical */}
                      <td style={{ padding: "14px 16px" }}>
                        {m?.is_critical ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "4px",
                            fontSize: "11px", fontWeight: "600",
                            color: "#DC2626", background: "#FEF2F2",
                            border: "1px solid #FECACA",
                            padding: "2px 8px", borderRadius: "4px",
                          }}>
                            <AlertIcon /> Critical
                          </span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#D1D5DB" }}>—</span>
                        )}
                      </td>

                      {/* View details button */}
                      <td style={{ padding: "14px 16px" }}>
                        <button
                          onClick={() => router.push(`/Super_user/milestone_detail?id=${s.id}`)}
                          style={{
                            display: "flex", alignItems: "center", gap: "5px",
                            padding: "6px 12px",
                            background: "#EFF6FF", border: "1px solid #BFDBFE",
                            borderRadius: "7px", fontSize: "12px", fontWeight: "600",
                            color: "#3B82F6", cursor: "pointer", fontFamily: "inherit",
                            whiteSpace: "nowrap", transition: "opacity 0.15s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                        >
                          View Details <ArrowIcon />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && displayed.length > 0 && (
          <div style={{
            padding: "12px 18px", borderTop: "1px solid #F3F4F6",
            background: "#F9FAFB", fontSize: "12px", color: "#6B7280",
          }}>
            Showing <strong style={{ color: "#374151" }}>{displayed.length}</strong> of{" "}
            <strong style={{ color: "#374151" }}>{data.length}</strong> shipments
          </div>
        )}
      </div>
    </div>
  );
}