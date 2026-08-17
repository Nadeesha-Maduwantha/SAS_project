"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const ROLE = "admin";

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
const SortIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/>
  </svg>
);
const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);
const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const ChevronUp = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────
function buildRoute(s) {
  const origin = [s.origin_city, s.origin_country_code].filter(Boolean).join(", ");
  const dest   = [s.destination_city, s.destination_country_code].filter(Boolean).join(", ");
  if (!origin && !dest) return "—";
  if (!origin) return dest;
  if (!dest)   return origin;
  return `${origin} → ${dest}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_STYLE = {
  pending:   { label: "Pending",   bg: "#F3F4F6", color: "#6B7280", border: "#D1D5DB" },
  overdue:   { label: "Overdue",   bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
  completed: { label: "Completed", bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },
};

// ── Sort dropdown ─────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: "due_date_asc",   label: "Due Date — Earliest first"  },
  { value: "due_date_desc",  label: "Due Date — Latest first"    },
  { value: "name_asc",       label: "Milestone Name — A to Z"    },
  { value: "name_desc",      label: "Milestone Name — Z to A"    },
  { value: "client_asc",     label: "Client — A to Z"            },
];

function SortDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = SORT_OPTIONS.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "7px",
          padding:      "8px 14px",
          background:   open ? "#EFF6FF" : "#fff",
          border:       `1px solid ${open ? "#BFDBFE" : "#E5E7EB"}`,
          borderRadius: "8px",
          fontSize:     "13px",
          fontWeight:   "500",
          color:        open ? "#2563EB" : "#374151",
          cursor:       "pointer",
          fontFamily:   "inherit",
          whiteSpace:   "nowrap",
          transition:   "all 0.15s",
        }}
      >
        <SortIcon />
        {current?.label ?? "Sort"}
        {open ? <ChevronUp /> : <ChevronDown />}
      </button>

      {open && (
        <div style={{
          position:     "absolute",
          top:          "calc(100% + 6px)",
          left:         0,
          zIndex:       100,
          background:   "#fff",
          border:       "1px solid #E5E7EB",
          borderRadius: "10px",
          boxShadow:    "0 8px 24px rgba(0,0,0,0.10)",
          minWidth:     "220px",
          overflow:     "hidden",
        }}>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                width:      "100%",
                textAlign:  "left",
                padding:    "10px 14px",
                fontSize:   "13px",
                fontWeight: value === opt.value ? "600" : "400",
                color:      value === opt.value ? "#2563EB" : "#374151",
                background: value === opt.value ? "#EFF6FF" : "transparent",
                border:     "none",
                cursor:     "pointer",
                fontFamily: "inherit",
                display:    "block",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => { if (value !== opt.value) e.currentTarget.style.background = "#F9FAFB"; }}
              onMouseLeave={e => { if (value !== opt.value) e.currentTarget.style.background = "transparent"; }}
            >
              {opt.value === value ? "✓ " : ""}{opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Department filter pills ───────────────────────────────────
const DEPT_FILTERS = [
  { value: "all", label: "All Departments" },
  { value: "AIR", label: "Air Freight"  },
  { value: "SEA", label: "Sea Freight"  },
];

function DeptFilter({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: "6px" }}>
      {DEPT_FILTERS.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "5px",
              padding:      "7px 13px",
              borderRadius: "8px",
              fontSize:     "12px",
              fontWeight:   active ? "700" : "500",
              fontFamily:   "inherit",
              cursor:       "pointer",
              transition:   "all 0.15s",
              border:       `1px solid ${active
                              ? opt.value === "AIR" ? "#BAE6FD"
                              : opt.value === "SEA" ? "#BBF7D0"
                              : "#BFDBFE"
                              : "#E5E7EB"}`,
              background:   active
                              ? opt.value === "AIR" ? "#F0F9FF"
                              : opt.value === "SEA" ? "#F0FDF4"
                              : "#EFF6FF"
                              : "#fff",
              color:        active
                              ? opt.value === "AIR" ? "#0369A1"
                              : opt.value === "SEA" ? "#15803D"
                              : "#2563EB"
                              : "#6B7280",
            }}
          >
            <FilterIcon />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Sortable column header ────────────────────────────────────
function SortableHeader({ label, sortKey, currentSort, onSort }) {
  const isAsc  = currentSort === `${sortKey}_asc`;
  const isDesc = currentSort === `${sortKey}_desc`;
  const active = isAsc || isDesc;

  return (
    <th
      onClick={() => onSort(isAsc ? `${sortKey}_desc` : `${sortKey}_asc`)}
      style={{
        padding:       "11px 16px",
        textAlign:     "left",
        fontSize:      "11px",
        fontWeight:    "600",
        color:         active ? "#2563EB" : "#6B7280",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace:    "nowrap",
        cursor:        "pointer",
        userSelect:    "none",
        background:    active ? "#F0F6FF" : "transparent",
        transition:    "all 0.12s",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
        {label}
        <span style={{ opacity: active ? 1 : 0.3 }}>
          {isDesc ? <ChevronDown /> : <ChevronUp />}
        </span>
      </span>
    </th>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function CurrentMilestonePage() {
  const router = useRouter();

  const [data,       setData]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [search,     setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter,   setDeptFilter]   = useState("all");
  const [sort,       setSort]       = useState("due_date_asc");

  useEffect(() => {
    fetch("http://localhost:5000/api/shipments/current-milestones")
      .then(r => { if (!r.ok) throw new Error(`Server error: ${r.status}`); return r.json(); })
      .then(result => setData(result.data ?? []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Filter ────────────────────────────────────────────────
  const filtered = data.filter(row => {
    const s = row.shipment;
    const m = row.current_milestone;
    const q = search.toLowerCase();

    const matchSearch = !q || [
      s.job_number, s.consignee_name, s.branch,
      s.transport_mode, m?.name, buildRoute(s),
    ].some(v => (v ?? "").toLowerCase().includes(q));

    const matchStatus =
      statusFilter === "all"     ? true :
      statusFilter === "overdue" ? m?.status === "overdue" :
      statusFilter === "pending" ? m?.status === "pending" :
      statusFilter === "none"    ? !m :
      true;

    const matchDept =
      deptFilter === "all" ? true :
      (s.transport_mode ?? "").toUpperCase() === deptFilter;

    return matchSearch && matchStatus && matchDept;
  });

  // ── Sort ──────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    const ma = a.current_milestone;
    const mb = b.current_milestone;

    if (sort === "due_date_asc" || sort === "due_date_desc") {
      const da = ma?.due_date ? new Date(ma.due_date).getTime() : Infinity;
      const db = mb?.due_date ? new Date(mb.due_date).getTime() : Infinity;
      return sort === "due_date_asc" ? da - db : db - da;
    }
    if (sort === "name_asc" || sort === "name_desc") {
      const na = (ma?.name ?? "").toLowerCase();
      const nb = (mb?.name ?? "").toLowerCase();
      return sort === "name_asc" ? na.localeCompare(nb) : nb.localeCompare(na);
    }
    if (sort === "client_asc") {
      const ca = (a.shipment.consignee_name ?? "").toLowerCase();
      const cb = (b.shipment.consignee_name ?? "").toLowerCase();
      return ca.localeCompare(cb);
    }
    return 0;
  });

  // ── Counts for stat cards ─────────────────────────────────
  const overdueCount = data.filter(r => r.current_milestone?.status === "overdue").length;
  const pendingCount = data.filter(r => r.current_milestone?.status === "pending").length;
  const noneCount    = data.filter(r => !r.current_milestone).length;
  const airCount     = data.filter(r => (r.shipment.transport_mode ?? "").toUpperCase() === "AIR").length;
  const seaCount     = data.filter(r => (r.shipment.transport_mode ?? "").toUpperCase() === "SEA").length;

  // Active filter count for indicator
  const activeFilters = [
    statusFilter !== "all",
    deptFilter   !== "all",
    search.trim() !== "",
  ].filter(Boolean).length;

  return (
    <div style={{
      minHeight:  "100vh",
      background: "#F9FAFB",
      fontFamily: "'Inter', -apple-system, sans-serif",
      color:      "#111827",
      padding:    "32px 32px 80px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; }
        table { border-collapse: collapse; width: 100%; }
      `}</style>

      {/* ── Page header ───────────────────────────────────── */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "21px", fontWeight: "700", letterSpacing: "-0.015em", marginBottom: "6px" }}>
          Current Milestones
        </h1>
        <p style={{ fontSize: "13px", color: "#6B7280" }}>
          Live view of each shipment's active milestone
        </p>
      </div>

      {/* ── Stat cards ────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
        {[
          { label: "Total",       value: data.length,  color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE", key: "all",     dept: null    },
          { label: "Overdue",     value: overdueCount, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", key: "overdue", dept: null    },
          { label: "Pending",     value: pendingCount, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", key: "pending", dept: null    },
          { label: "No Milestone",value: noneCount,    color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB", key: "none",    dept: null    },
          { label: "✈ Air",       value: airCount,     color: "#0369A1", bg: "#F0F9FF", border: "#BAE6FD", key: null,      dept: "AIR"   },
          { label: "🚢 Sea",      value: seaCount,     color: "#15803D", bg: "#F0FDF4", border: "#BBF7D0", key: null,      dept: "SEA"   },
        ].map((card, i) => {
          const statusActive = card.key && statusFilter === card.key;
          const deptActive   = card.dept && deptFilter  === card.dept;
          const active       = statusActive || deptActive;
          return (
            <div
              key={i}
              onClick={() => {
                if (card.key)  setStatusFilter(f => f === card.key  ? "all" : card.key);
                if (card.dept) setDeptFilter(f   => f === card.dept ? "all" : card.dept);
              }}
              style={{
                flex:       "1",
                minWidth:   "110px",
                background: active ? card.bg  : "#fff",
                border:     `1px solid ${active ? card.border : "#E5E7EB"}`,
                borderRadius: "12px",
                padding:    "14px 18px",
                cursor:     "pointer",
                transition: "all 0.15s",
                boxShadow:  "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "5px" }}>
                {card.label}
              </div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: active ? card.color : "#111827" }}>
                {loading ? "…" : card.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Toolbar ───────────────────────────────────────── */}
      <div style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "10px",
        marginBottom: "16px",
        flexWrap:     "wrap",
      }}>

        {/* Search */}
        <div style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "8px",
          background:   "#fff",
          border:       "1px solid #E5E7EB",
          borderRadius: "8px",
          padding:      "8px 14px",
          flex:         "1",
          minWidth:     "220px",
          maxWidth:     "320px",
        }}>
          <SearchIcon />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search shipments, milestones..."
            style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px", color: "#374151", flex: 1, fontFamily: "inherit" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 0, fontSize: "15px", lineHeight: 1 }}>
              ×
            </button>
          )}
        </div>

        {/* Department filter pills */}
        <DeptFilter value={deptFilter} onChange={setDeptFilter} />

        {/* Sort dropdown */}
        <SortDropdown value={sort} onChange={setSort} />

        {/* Active filter badge */}
        {activeFilters > 0 && (
          <button
            onClick={() => { setStatusFilter("all"); setDeptFilter("all"); setSearch(""); }}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "5px",
              padding:      "7px 12px",
              background:   "#FEF2F2",
              border:       "1px solid #FECACA",
              borderRadius: "8px",
              fontSize:     "12px",
              fontWeight:   "600",
              color:        "#DC2626",
              cursor:       "pointer",
              fontFamily:   "inherit",
              transition:   "opacity 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            × Clear {activeFilters} filter{activeFilters > 1 ? "s" : ""}
          </button>
        )}

        {/* Result count */}
        <span style={{ fontSize: "13px", color: "#6B7280", marginLeft: "auto" }}>
          <strong style={{ color: "#111827" }}>{sorted.length}</strong> of{" "}
          <strong style={{ color: "#111827" }}>{data.length}</strong> shipments
        </span>
      </div>

      {/* ── Table ─────────────────────────────────────────── */}
      <div style={{
        background:   "#fff",
        border:       "1px solid #E5E7EB",
        borderRadius: "14px",
        overflow:     "hidden",
        boxShadow:    "0 1px 6px rgba(0,0,0,0.06)",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                {/* Non-sortable columns */}
                {["Shipment", "Client", "Route", "Mode"].map(h => (
                  <th key={h} style={{
                    padding: "11px 16px", textAlign: "left",
                    fontSize: "11px", fontWeight: "600", color: "#6B7280",
                    letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
                  }}>
                    {h}
                  </th>
                ))}

                {/* Sortable columns */}
                <SortableHeader label="Milestone"  sortKey="name"     currentSort={sort} onSort={setSort} />
                <th style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  Status
                </th>
                <SortableHeader label="Due Date"   sortKey="due_date" currentSort={sort} onSort={setSort} />
                <SortableHeader label="Client"     sortKey="client"   currentSort={sort} onSort={setSort} />

                <th style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  Critical
                </th>
                <th style={{ padding: "11px 16px" }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                      <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid #E5E7EB", borderTopColor: "#3B82F6", animation: "spin 0.7s linear infinite" }} />
                      <span style={{ fontSize: "13px", color: "#9CA3AF" }}>Loading shipments...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "40px 20px", color: "#DC2626", fontSize: "13px" }}>
                    ⚠ {error}
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ color: "#9CA3AF", fontSize: "13px" }}>
                      No shipments match your filters.
                      {activeFilters > 0 && (
                        <button
                          onClick={() => { setStatusFilter("all"); setDeptFilter("all"); setSearch(""); }}
                          style={{ background: "none", border: "none", color: "#3B82F6", cursor: "pointer", fontSize: "13px", fontFamily: "inherit", marginLeft: "6px", textDecoration: "underline" }}
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map(row => {
                  const s  = row.shipment;
                  const m  = row.current_milestone;
                  const st = m ? (STATUS_STYLE[m.status] ?? STATUS_STYLE.pending) : null;

                  return (
                    <tr
                      key={s.id}
                      style={{ borderBottom: "1px solid #F3F4F6", transition: "background 0.12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Shipment ID */}
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", fontWeight: "600", color: "#3B82F6", background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "2px 8px", borderRadius: "4px" }}>
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
                          background: s.transport_mode === "AIR" ? "#F0F9FF" : s.transport_mode === "SEA" ? "#F0FDF4" : "#F3F4F6",
                          color:      s.transport_mode === "AIR" ? "#0369A1" : s.transport_mode === "SEA" ? "#15803D" : "#6B7280",
                          border:     s.transport_mode === "AIR" ? "1px solid #BAE6FD" : s.transport_mode === "SEA" ? "1px solid #BBF7D0" : "1px solid #E5E7EB",
                        }}>
                          {s.transport_mode ?? "—"}
                        </span>
                      </td>

                      {/* Milestone name */}
                      <td style={{ padding: "14px 16px", fontSize: "13px", color: "#374151", maxWidth: "180px" }}>
                        {m
                          ? <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: "500" }}>{m.name}</div>
                          : <span style={{ fontSize: "12px", color: "#D1D5DB" }}>No milestone assigned</span>
                        }
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 16px" }}>
                        {m ? (
                          <span style={{ fontSize: "11px", fontWeight: "600", padding: "3px 9px", borderRadius: "5px", background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                            {st.label}
                          </span>
                        ) : <span style={{ fontSize: "12px", color: "#D1D5DB" }}>—</span>}
                      </td>

                      {/* Due date */}
                      <td style={{ padding: "14px 16px", fontSize: "12px", color: "#6B7280", whiteSpace: "nowrap" }}>
                        {m ? (
                          <span style={{ color: m.status === "overdue" ? "#DC2626" : "#6B7280", fontWeight: m.status === "overdue" ? "600" : "400" }}>
                            {formatDate(m.due_date)}
                          </span>
                        ) : "—"}
                      </td>

                      {/* Client (hidden — used for sort only, shown in Client col) */}
                      <td style={{ display: "none" }} />

                      {/* Critical */}
                      <td style={{ padding: "14px 16px" }}>
                        {m?.is_critical ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "600", color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", padding: "2px 8px", borderRadius: "4px" }}>
                            <AlertIcon /> Critical
                          </span>
                        ) : <span style={{ fontSize: "12px", color: "#D1D5DB" }}>—</span>}
                      </td>

                      {/* View details */}
                      <td style={{ padding: "14px 16px" }}>
                        <button
                          onClick={() => router.push(`/admin/milestone_detail?id=${s.id}`)}
                          style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "7px", fontSize: "12px", fontWeight: "600", color: "#3B82F6", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "opacity 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
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
        {!loading && sorted.length > 0 && (
          <div style={{ padding: "12px 18px", borderTop: "1px solid #F3F4F6", background: "#F9FAFB", fontSize: "12px", color: "#6B7280", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              Showing <strong style={{ color: "#374151" }}>{sorted.length}</strong> of{" "}
              <strong style={{ color: "#374151" }}>{data.length}</strong> shipments
            </span>
            {activeFilters > 0 && (
              <span style={{ color: "#9CA3AF" }}>
                {activeFilters} filter{activeFilters > 1 ? "s" : ""} active —{" "}
                <button
                  onClick={() => { setStatusFilter("all"); setDeptFilter("all"); setSearch(""); }}
                  style={{ background: "none", border: "none", color: "#3B82F6", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", padding: 0, textDecoration: "underline" }}
                >
                  clear all
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}