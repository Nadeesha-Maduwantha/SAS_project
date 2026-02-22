"use client";

// =============================================================
//  File path: app/(protected)/Super_user/milestone_templates_list/page.jsx
//  Route:     /Super_user/milestone_templates_list
//
//  Shows all milestone templates belonging to the Super User's
//  department. Same table design as admin list.
//  Super User CAN: view, create, edit templates in their dept.
//  Super User CANNOT: see or manage other departments' templates.
// =============================================================

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/styles/tokens";

// ── Dummy data — replace with API fetch filtered by department ─
// e.g. fetchTemplates({ department: currentUser.department })

const DEPARTMENT = "Operations"; // replace with currentUser.department from auth

const TEMPLATES = [
  { id: "TPL-001", name: "Standard Air Freight",      derivedFrom: null,                   milestones: 8,  shipmentType: "Air Freight", createdBy: "Admin User",  createdAt: "10 Nov 2024", department: "Operations" },
  { id: "TPL-002", name: "Express Air – High Value",  derivedFrom: "Standard Air Freight", milestones: 11, shipmentType: "Air Freight", createdBy: "Admin User",  createdAt: "15 Nov 2024", department: "Operations" },
  { id: "TPL-003", name: "Standard Sea Freight",       derivedFrom: null,                   milestones: 14, shipmentType: "Sea Freight", createdBy: "Super User",  createdAt: "01 Dec 2024", department: "Operations" },
  { id: "TPL-004", name: "Live Cargo – Marine Life",   derivedFrom: "Standard Sea Freight", milestones: 17, shipmentType: "Sea Freight", createdBy: "Admin User",  createdAt: "05 Dec 2024", department: "Operations" },
  { id: "TPL-005", name: "Temperature Sensitive Sea",  derivedFrom: "Standard Sea Freight", milestones: 16, shipmentType: "Sea Freight", createdBy: "Super User",  createdAt: "08 Jan 2025", department: "Operations" },
  { id: "TPL-006", name: "Air Freight – Perishables",  derivedFrom: "Standard Air Freight", milestones: 13, shipmentType: "Air Freight", createdBy: "Admin User",  createdAt: "20 Jan 2025", department: "Operations" },
  { id: "TPL-007", name: "FCL Ocean Standard",         derivedFrom: null,                   milestones: 12, shipmentType: "Sea Freight", createdBy: "Super User",  createdAt: "01 Feb 2025", department: "Operations" },
];

// ── Filter / sort options ─────────────────────────────────────

const SHIPMENT_TYPES = ["All Types", "Air Freight", "Sea Freight"];
const SORT_OPTIONS   = ["Newest First", "Oldest First", "Name A → Z", "Name Z → A", "Most Milestones", "Least Milestones"];


// ── Icons ─────────────────────────────────────────────────────

const IcoFilter = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const IcoSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.gray400} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IcoPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IcoChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IcoCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IcoChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ── Progress bar (milestone count visualiser) ─────────────────

function MilestoneBar({ count }) {
  const max = 20;
  const pct = Math.min((count / max) * 100, 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{
        width:        "90px",
        height:       "5px",
        borderRadius: "99px",
        background:   T.gray200,
        overflow:     "hidden",
        flexShrink:   0,
      }}>
        <div style={{
          height:       "100%",
          borderRadius: "99px",
          background:   T.blue,
          width:        `${pct}%`,
        }} />
      </div>
      <span style={{ fontSize: "13px", fontWeight: "600", color: T.gray700 }}>{count}</span>
    </div>
  );
}

// ── Filter Dropdown ───────────────────────────────────────────

function FilterDropdown({ typeFilter, setTypeFilter, sortOrder, setSortOrder, onClose }) {
  const [openPane, setOpenPane] = useState(null);

  const MenuRow = ({ label, pane }) => (
    <div
      onClick={() => setOpenPane(openPane === pane ? null : pane)}
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "10px 18px",
        cursor:         "pointer",
        fontSize:       "13px",
        fontWeight:     openPane === pane ? "600" : "500",
        color:          openPane === pane ? T.blue : T.gray700,
        background:     openPane === pane ? T.blueBg : "transparent",
        transition:     "background 0.12s",
      }}
      onMouseEnter={e => { if (openPane !== pane) e.currentTarget.style.background = T.gray50; }}
      onMouseLeave={e => { if (openPane !== pane) e.currentTarget.style.background = "transparent"; }}
    >
      <span>{label}</span>
      <span style={{ color: openPane === pane ? T.blue : T.gray400 }}><IcoChevronRight /></span>
    </div>
  );

  const OptionPane = ({ options, selected, onSelect }) => (
    <div style={{
      borderLeft:   `1px solid ${T.gray200}`,
      padding:      "8px 0",
      minWidth:     "220px",
      background:   T.cardBg,
      borderRadius: "0 12px 12px 0",
    }}>
      {options.map(opt => (
        <div
          key={opt}
          onClick={() => { onSelect(opt); onClose(); }}
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "10px 18px",
            cursor:         "pointer",
            fontSize:       "13px",
            fontWeight:     selected === opt ? "600" : "400",
            color:          selected === opt ? T.blue : T.gray700,
            background:     selected === opt ? T.blueBg : "transparent",
            transition:     "background 0.12s",
          }}
          onMouseEnter={e => { if (selected !== opt) e.currentTarget.style.background = T.gray50; }}
          onMouseLeave={e => { if (selected !== opt) e.currentTarget.style.background = "transparent"; }}
        >
          {opt}
          {selected === opt && <span style={{ color: T.blue }}><IcoCheck /></span>}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{
      position:     "absolute",
      top:          "44px",
      left:         0,
      zIndex:       200,
      display:      "flex",
      background:   T.cardBg,
      border:       `1px solid ${T.gray200}`,
      borderRadius: "12px",
      boxShadow:    "0 8px 32px rgba(0,0,0,0.12)",
      minWidth:     "190px",
    }}>
      <div style={{ padding: "8px 0", minWidth: "190px" }}>
        <MenuRow label="Shipment Type" pane="type"    />
        <MenuRow label="Sort By"       pane="sort"    />
        
      </div>
      {openPane === "type"    && <OptionPane options={SHIPMENT_TYPES}  selected={typeFilter}    onSelect={setTypeFilter}    />}
      {openPane === "sort"    && <OptionPane options={SORT_OPTIONS}    selected={sortOrder}     onSelect={setSortOrder}     />}
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────

function TemplateRow({ template, onClick }) {
  const [hov, setHov] = useState(false);

  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? T.gray50 : T.cardBg,
        cursor:     "pointer",
        transition: "background 0.13s",
      }}
    >
      {/* Name + ID */}
      <td style={td}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: T.gray900 }}>
            {template.name}
          </span>
          <span style={{
            fontFamily:    "'IBM Plex Mono', monospace",
            fontSize:      "10px",
            fontWeight:    "600",
            color:         T.gray400,
            background:    T.gray100,
            border:        `1px solid ${T.gray200}`,
            padding:       "2px 7px",
            borderRadius:  "4px",
            letterSpacing: "0.04em",
            flexShrink:    0,
          }}>
            {template.id}
          </span>
        </div>
      </td>

      {/* Created by */}
      <td style={td}>
        <span style={{ fontSize: "13px", color: T.gray500 }}>{template.createdBy}</span>
      </td>

      {/* Derived from */}
      <td style={td}>
        {template.derivedFrom ? (
          <span style={{
            fontSize:     "12px",
            fontWeight:   "500",
            color:        T.blue,
            background:   T.blueBg,
            border:       `1px solid ${T.blueBorder}`,
            padding:      "3px 10px",
            borderRadius: "5px",
            whiteSpace:   "nowrap",
          }}>
            {template.derivedFrom}
          </span>
        ) : (
          <span style={{
            fontSize:     "12px",
            fontWeight:   "600",
            color:        T.green,
            background:   T.greenBg,
            border:       `1px solid ${T.greenBorder}`,
            padding:      "3px 10px",
            borderRadius: "5px",
          }}>
            Original
          </span>
        )}
      </td>

      {/* Milestones bar */}
      <td style={td}>
        <MilestoneBar count={template.milestones} />
      </td>

      {/* Shipment type */}
      <td style={td}>
        <span style={{
          fontSize:     "12px",
          fontWeight:   "500",
          color:        T.blue,
          background:   T.blueBg,
          border:       `1px solid ${T.blueBorder}`,
          padding:      "3px 10px",
          borderRadius: "5px",
          whiteSpace:   "nowrap",
        }}>
          {template.shipmentType}
        </span>
      </td>

      {/* Created date */}
      <td style={{ ...td, color: T.gray500, fontSize: "13px" }}>
        {template.createdAt}
      </td>
    </tr>
  );
}

const td = {
  padding:       "15px 18px",
  verticalAlign: "middle",
  borderBottom:  `1px solid ${T.gray100}`,
};

const th = {
  padding:       "11px 18px",
  textAlign:     "left",
  fontSize:      "11px",
  fontWeight:    "600",
  color:         T.gray500,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  borderBottom:  `1px solid ${T.gray200}`,
  background:    T.gray50,
  whiteSpace:    "nowrap",
};

// ── Page ──────────────────────────────────────────────────────

export default function SuperUserTemplatesListPage() {
  const router = useRouter();

  const [search,        setSearch]        = useState("");
  const [typeFilter,    setTypeFilter]    = useState("All Types");
  const [sortOrder,     setSortOrder]     = useState("Newest First");
  const [filterOpen,    setFilterOpen]    = useState(false);

  const filtered = useMemo(() => {
    let list = [...TEMPLATES];

    // Shipment type
    if (typeFilter !== "All Types") {
      list = list.filter(t => t.shipmentType === typeFilter);
    }


    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.derivedFrom || "").toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortOrder) {
      case "Oldest First":
        list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case "Name A → Z":
        list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "Name Z → A":
        list.sort((a, b) => b.name.localeCompare(a.name)); break;
      case "Most Milestones":
        list.sort((a, b) => b.milestones - a.milestones); break;
      case "Least Milestones":
        list.sort((a, b) => a.milestones - b.milestones); break;
      default: // Newest First
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return list;
  }, [search, typeFilter, sortOrder]);

  const activeFilters = [
    typeFilter    !== "All Types"      ? typeFilter    : null,
    sortOrder     !== "Newest First"   ? sortOrder     : null,
  ].filter(Boolean);

  const clearFilter = (f) => {
    if (SHIPMENT_TYPES.includes(f))  setTypeFilter("All Types");
    if (SORT_OPTIONS.includes(f))    setSortOrder("Newest First");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        table { border-collapse: collapse; width: 100%; }
      `}</style>

      <div style={{
        minHeight:  "100vh",
        background: T.pageBg,
        fontFamily: "'Inter', -apple-system, sans-serif",
        color:      T.gray900,
        padding:    "32px 32px 80px",
      }}>

        {/* ── Page header ─────────────────────────────────────── */}
        <div style={{
          display:        "flex",
          alignItems:     "flex-start",
          justifyContent: "space-between",
          gap:            "16px",
          marginBottom:   "24px",
          flexWrap:       "wrap",
        }}>
          <div>
            <h1 style={{
              fontSize:      "21px",
              fontWeight:    "700",
              color:         T.gray900,
              letterSpacing: "-0.015em",
              marginBottom:  "4px",
            }}>
              Milestone Templates
            </h1>
            {/* Department indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", color: T.gray500 }}>
                Showing templates for
              </span>
              <span style={{
                fontSize:     "12px",
                fontWeight:   "600",
                color:        T.blue,
                background:   T.blueBg,
                border:       `1px solid ${T.blueBorder}`,
                padding:      "2px 10px",
                borderRadius: "5px",
              }}>
                {DEPARTMENT} Department
              </span>
            </div>
          </div>

          {/* Create template button */}
          <button
            onClick={() => router.push("/Super_user/milestone_template_create")}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "7px",
              padding:      "10px 20px",
              background:   T.blue,
              border:       "none",
              borderRadius: "9px",
              fontSize:     "13px",
              fontWeight:   "600",
              color:        "#fff",
              cursor:       "pointer",
              fontFamily:   "inherit",
              transition:   "opacity 0.15s",
              flexShrink:   0,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.87"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <IcoPlus /> Create Template
          </button>
        </div>

        {/* ── Summary stats row ───────────────────────────────── */}
        <div style={{
          display:      "flex",
          gap:          "12px",
          marginBottom: "22px",
          flexWrap:     "wrap",
        }}>
          {[
            { label: "Total Templates",  value: TEMPLATES.length },
            { label: "Original",         value: TEMPLATES.filter(t => !t.derivedFrom).length },
            { label: "Derived",          value: TEMPLATES.filter(t => !!t.derivedFrom).length },
            { label: "Air Freight",      value: TEMPLATES.filter(t => t.shipmentType === "Air Freight").length },
            { label: "Sea Freight",      value: TEMPLATES.filter(t => t.shipmentType === "Sea Freight").length },
          ].map(s => (
            <div key={s.label} style={{
              background:   T.cardBg,
              border:       T.cardBorder,
              borderRadius: "10px",
              padding:      "12px 18px",
              boxShadow:    T.cardShadow,
              display:      "flex",
              alignItems:   "center",
              gap:          "10px",
            }}>
              <span style={{ fontSize: "20px", fontWeight: "700", color: T.gray900 }}>{s.value}</span>
              <span style={{ fontSize: "12px", color: T.gray500 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Toolbar ─────────────────────────────────────────── */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          gap:            "12px",
          marginBottom:   "14px",
          flexWrap:       "wrap",
          position:       "relative",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>

            {/* Filter button */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setFilterOpen(o => !o)}
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "7px",
                  padding:      "8px 16px",
                  background:   filterOpen ? T.blueBg : T.cardBg,
                  border:       `1px solid ${filterOpen ? T.blueBorder : T.gray200}`,
                  borderRadius: "8px",
                  fontSize:     "13px",
                  fontWeight:   "500",
                  color:        filterOpen ? T.blue : T.gray700,
                  cursor:       "pointer",
                  fontFamily:   "inherit",
                  transition:   "all 0.15s",
                }}
                onMouseEnter={e => { if (!filterOpen) { e.currentTarget.style.borderColor = T.gray300; e.currentTarget.style.background = T.gray50; } }}
                onMouseLeave={e => { if (!filterOpen) { e.currentTarget.style.borderColor = T.gray200; e.currentTarget.style.background = T.cardBg; } }}
              >
                <IcoFilter /> Filter &amp; Sort
                {activeFilters.length > 0 && (
                  <span style={{
                    background:   T.blue,
                    color:        "#fff",
                    fontSize:     "10px",
                    fontWeight:   "700",
                    borderRadius: "99px",
                    padding:      "1px 6px",
                    marginLeft:   "2px",
                  }}>
                    {activeFilters.length}
                  </span>
                )}
              </button>

              {filterOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setFilterOpen(false)} />
                  <FilterDropdown
                    typeFilter={typeFilter}       setTypeFilter={setTypeFilter}
                    sortOrder={sortOrder}         setSortOrder={setSortOrder}
                    onClose={() => setFilterOpen(false)}
                  />
                </>
              )}
            </div>

            {/* Active filter chips */}
            {activeFilters.map(f => (
              <span key={f} style={{
                display:      "flex",
                alignItems:   "center",
                gap:          "5px",
                fontSize:     "12px",
                color:        T.blue,
                background:   T.blueBg,
                border:       `1px solid ${T.blueBorder}`,
                borderRadius: "6px",
                padding:      "4px 10px",
                fontWeight:   "500",
              }}>
                {f}
                <span
                  onClick={() => clearFilter(f)}
                  style={{ cursor: "pointer", color: T.blueMid, lineHeight: 1 }}
                >
                  ×
                </span>
              </span>
            ))}
          </div>

          {/* Search */}
          <div style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "8px",
            background:   T.cardBg,
            border:       `1px solid ${T.gray200}`,
            borderRadius: "8px",
            padding:      "8px 14px",
            minWidth:     "260px",
          }}>
            <IcoSearch />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates..."
              style={{
                border:     "none",
                outline:    "none",
                background: "transparent",
                fontSize:   "13px",
                color:      T.gray700,
                flex:       1,
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────────── */}
        <div style={{
          background:   T.cardBg,
          border:       `1px solid ${T.gray200}`,
          borderRadius: "14px",
          overflow:     "hidden",
          boxShadow:    "0 1px 6px rgba(0,0,0,0.06)",
        }}>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th style={th}>TEMPLATE NAME</th>
                  <th style={th}>CREATED BY</th>
                  <th style={th}>DERIVED FROM</th>
                  <th style={th}>MILESTONES</th>
                  <th style={th}>SHIPMENT TYPE</th>
                  <th style={th}>CREATED</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "60px 20px", color: T.gray400, fontSize: "13px" }}>
                      No templates match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map(t => (
                    <TemplateRow
                      key={t.id}
                      template={t}
                      onClick={() => router.push(`/Super_user/milestone_template?id=${t.id}`)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "12px 18px",
            borderTop:      `1px solid ${T.gray100}`,
            background:     T.gray50,
            flexWrap:       "wrap",
            gap:            "8px",
          }}>
            <span style={{ fontSize: "12px", color: T.gray500 }}>
              Showing <strong style={{ color: T.gray700 }}>{filtered.length}</strong> of{" "}
              <strong style={{ color: T.gray700 }}>{TEMPLATES.length}</strong> templates
              {" "}in <strong style={{ color: T.gray700 }}>{DEPARTMENT}</strong> department
            </span>
            <span style={{ fontSize: "11px", color: T.gray400 }}>
              Click any row to view or edit
            </span>
          </div>
        </div>

      </div>
    </>
  );
}