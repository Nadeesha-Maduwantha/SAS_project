"use client";

// =============================================================
//  MilestonesTable.jsx
//  Path: app/(protected)/admin/shipment_milestones/components/MilestonesTable.jsx
//
//  Shared table used by all four roles.
//  Props:
//    role        — "admin" | "super_user" | "operations_user" | "sales_user"
//    shipment    — shipment meta object
//    milestones  — array of milestone objects
//    contacts    — { operationsUser, carrier, client }
// =============================================================

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { T, solidBtn, outlineBtn, ghostBtn } from "@/styles/tokens";

// ── Icons ──────────────────────────────────────────────────────

const IcoFilter = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const IcoSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.gray400} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

const IcoSort = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6"  x2="21" y2="6"  />
    <line x1="3" y1="12" x2="15" y2="12" />
    <line x1="3" y1="18" x2="9"  y2="18" />
  </svg>
);

const IcoZap = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function Badge({ text, color, bg, border }) {
  return (
    <span style={{
      display:       "inline-flex",
      alignItems:    "center",
      fontSize:      "11px",
      fontWeight:    "600",
      color,
      background:    bg,
      border:        `1px solid ${border}`,
      padding:       "3px 9px",
      borderRadius:  "5px",
      letterSpacing: "0.03em",
      whiteSpace:    "nowrap",
    }}>
      {text}
    </span>
  );
}

// ── Role config — "Take Action" button label and colour ────────

const ROLE_ACTION = {
  admin:           { label: "Notify Operations",  color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  super_user:      { label: "Notify Operations",  color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  operations_user: { label: "Contact Carrier",    color: T.blue,    bg: T.blueBg,  border: T.blueBorder },
  sales_user:      { label: "Update Client",      color: T.green,   bg: T.greenBg, border: T.greenBorder },
};

// ── Table cell styles ─────────────────────────────────────────

const td = {
  padding:       "14px 16px",
  verticalAlign: "middle",
  borderBottom:  `1px solid ${T.gray100}`,
};

const th = {
  padding:       "11px 16px",
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

// ── Filter options ────────────────────────────────────────────

const STATUS_OPTIONS = ["All Milestones", "Completed", "About to Complete"];
const SORT_OPTIONS   = ["Default (Current First)", "Ascending (1 → 9)", "Descending (9 → 1)"];

// ── Filter Dropdown ───────────────────────────────────────────

function FilterDropdown({ statusFilter, setStatusFilter, sortOrder, setSortOrder, onClose }) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [sortOpen,   setSortOpen]   = useState(false);

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

  const MenuRow = ({ label, isOpen, onClick }) => (
    <div
      onClick={onClick}
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "10px 18px",
        cursor:         "pointer",
        fontSize:       "13px",
        fontWeight:     isOpen ? "600" : "500",
        color:          isOpen ? T.blue : T.gray700,
        background:     isOpen ? T.blueBg : "transparent",
        transition:     "background 0.12s",
      }}
      onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = T.gray50; }}
      onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = "transparent"; }}
    >
      <span>{label}</span>
      <span style={{ color: isOpen ? T.blue : T.gray400 }}><IcoChevronRight /></span>
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
      minWidth:     "180px",
    }}>
      <div style={{ padding: "8px 0", minWidth: "180px" }}>
        <MenuRow label="Status"  isOpen={statusOpen} onClick={() => { setStatusOpen(o => !o); setSortOpen(false); }} />
        <MenuRow label="Sort By" isOpen={sortOpen}   onClick={() => { setSortOpen(o => !o); setStatusOpen(false); }} />
      </div>
      {statusOpen && <OptionPane options={STATUS_OPTIONS} selected={statusFilter} onSelect={setStatusFilter} />}
      {sortOpen   && <OptionPane options={SORT_OPTIONS}   selected={sortOrder}    onSelect={setSortOrder}    />}
    </div>
  );
}

// ── Milestone Row ─────────────────────────────────────────────

function MilestoneRow({ milestone, isCurrent, role, shipment, contacts, onTakeAction, router }) {
  const [hov, setHov] = useState(false);
  const action = ROLE_ACTION[role] || ROLE_ACTION.admin;

  const rowBg = isCurrent
    ? (hov ? "#F0FDF8" : "#F6FFF9")
    : hov ? T.gray50 : T.cardBg;

  return (
<tr
  onMouseEnter={() => setHov(true)}
  onMouseLeave={() => setHov(false)}
  onClick={() => router.push(`/admin/milestone_detail?milestoneId=${milestone.id}&shipmentId=${shipment.id}`)}
  style={{ background: rowBg, borderLeft: `3px solid ${isCurrent ? T.green : "transparent"}`, transition: "background 0.15s", cursor: "pointer" }}
>
      {/* Seq */}
      <td style={{ ...td, width: "56px" }}>
        <span style={{
          fontFamily:   "'IBM Plex Mono', monospace",
          fontSize:     "11px",
          fontWeight:   "600",
          color:        isCurrent ? T.green : T.gray400,
          background:   isCurrent ? "#DCFCE7" : T.gray100,
          border:       `1px solid ${isCurrent ? T.greenBorder : T.gray200}`,
          padding:      "2px 7px",
          borderRadius: "4px",
          letterSpacing:"0.04em",
        }}>
          {String(milestone.seq).padStart(2, "0")}
        </span>
      </td>

      {/* Milestone name */}
      <td style={{ ...td, minWidth: "200px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", fontWeight: isCurrent ? "700" : "500", color: isCurrent ? T.gray900 : T.gray700 }}>
            {milestone.name}
          </span>
          {milestone.critical  && <Badge text="CRITICAL" color={T.red}    bg={T.redBg}   border={T.redBorder} />}
          {milestone.automated && <Badge text="AUTO"     color={T.gray500} bg={T.gray100} border={T.gray300}  />}
        </div>
      </td>

      {/* Status */}
      <td style={{ ...td, width: "160px" }}>
        {isCurrent ? (
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: T.green, display: "inline-block",
              animation: "pulse 1.8s ease-in-out infinite", flexShrink: 0,
            }} />
            <Badge text="In Progress" color={T.green} bg="#DCFCE7" border={T.greenBorder} />
          </div>
        ) : milestone.status === "completed" ? (
          <Badge text="Completed" color={T.green} bg={T.greenBg} border={T.greenBorder} />
        ) : (
          <Badge text="Upcoming"  color={T.gray500} bg={T.gray100} border={T.gray300} />
        )}
      </td>

      {/* Expected */}
      <td style={{ ...td, width: "130px" }}>
        <span style={{ fontSize: "12px", color: T.gray500 }}>{formatDate(milestone.expectedDate)}</span>
      </td>

      {/* Completed */}
      <td style={{ ...td, width: "130px" }}>
        {milestone.completedAt ? (
          <span style={{ fontSize: "12px", fontWeight: "500", color: T.gray700 }}>{formatDate(milestone.completedAt)}</span>
        ) : isCurrent ? (
          <span style={{ fontSize: "12px", fontWeight: "500", color: T.amber }}>Due in {milestone.daysRemaining}d</span>
        ) : (
          <span style={{ fontSize: "12px", color: T.gray300 }}>—</span>
        )}
      </td>

      {/* Completed by */}
      <td style={{ ...td, width: "140px" }}>
        {milestone.completedBy ? (
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <div style={{
              width: "22px", height: "22px", borderRadius: "50%",
              background: T.blueBg, border: `1px solid ${T.blueBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "10px", fontWeight: "700", color: T.blue, flexShrink: 0,
            }}>
              {milestone.completedBy.split(" ").map(w => w[0]).join("").slice(0, 2)}
            </div>
            <span style={{ fontSize: "12px", color: T.gray700 }}>{milestone.completedBy}</span>
          </div>
        ) : (
          <span style={{ fontSize: "12px", color: T.gray300 }}>—</span>
        )}
      </td>

      {/* Notes */}
      <td style={{ ...td, maxWidth: "160px" }}>
        {milestone.notes ? (
          <span style={{
            fontSize: "11px", color: T.gray500, background: T.gray50,
            border: `1px solid ${T.gray200}`, borderRadius: "5px",
            padding: "3px 8px", display: "inline-block",
            maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {milestone.notes}
          </span>
        ) : (
          <span style={{ fontSize: "12px", color: T.gray300 }}>—</span>
        )}
      </td>

      {/* Take Action — only for current milestone */}
      <td style={{ ...td, width: "160px" }}>
        {isCurrent ? (
          <button
            onClick={() => onTakeAction(milestone)}
            style={{
              display:        "flex",
              alignItems:     "center",
              gap:            "6px",
              padding:        "7px 14px",
              background:     action.bg,
              border:         `1px solid ${action.border}`,
              borderRadius:   "8px",
              fontSize:       "12px",
              fontWeight:     "600",
              color:          action.color,
              cursor:         "pointer",
              fontFamily:     "inherit",
              whiteSpace:     "nowrap",
              transition:     "opacity 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <IcoZap /> {action.label}
          </button>
        ) : (
          <span style={{ fontSize: "12px", color: T.gray300 }}>—</span>
        )}
      </td>
    </tr>
  );
}

// ── Email subject builder (matches what TakeActionModal used to generate) ──

function buildSubject(role, milestone, shipment) {
  if (role === "admin" || role === "super_user") {
    return `[SAS] Action Required — ${milestone.name} | ${shipment.id}`;
  }
  if (role === "operations_user") {
    return `Shipment Update Request — ${shipment.id} | ${milestone.name}`;
  }
  if (role === "sales_user") {
    return `Shipment Status Update — ${shipment.id}`;
  }
  return `Action Required — ${shipment.id}`;
}

// ── Main Component ────────────────────────────────────────────

export default function MilestonesTable({ role, shipment, milestones, contacts }) {
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState("All Milestones");
  const [sortOrder, setSortOrder] = useState("Ascending (1 → 9)");
  const [filterOpen,    setFilterOpen]    = useState(false);
  const router = useRouter();

  // Determine which contact to alert based on role
  const handleTakeAction = (milestone) => {
    const recipientMap = {
      admin:           contacts.operationsUser,
      super_user:      contacts.operationsUser,
      operations_user: contacts.carrier,
      sales_user:      contacts.client,
    };
    const recipient = recipientMap[role] || contacts.operationsUser;

    // Build query params so the mail creation page can pre-fill fields
    const params = new URLSearchParams({
      to:          recipient?.email        ?? "",
      toName:      recipient?.name         ?? "",
      subject:     buildSubject(role, milestone, shipment),
      shipmentId:  shipment.id,
      milestone:   milestone.name,
      role,
    });

    // ── Navigate to milestone detail page where the alert can be sent ──
    router.push(`/admin/milestone_detail?milestoneId=${milestone.id}&shipmentId=${shipment.id}`);
  };

  const completedCount = milestones.filter(m => m.status === "completed").length;
  const totalCount     = milestones.length;

  const displayed = useMemo(() => {
    let list = [...milestones];

    // Status filter
    if (statusFilter === "Completed") {
      list = list.filter(m => m.status === "completed");
    } else if (statusFilter === "About to Complete") {
      list = list.filter(m => m.status === "completed" || m.status === "current");
    } else if (sortOrder === "Default (Current First)") {
      list = list.filter(m => m.status !== "upcoming");
    }

    // When ascending/descending selected, show everything
    if (sortOrder !== "Default (Current First)" && statusFilter === "All Milestones") {
      list = [...milestones];
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.completedBy || "").toLowerCase().includes(q) ||
        (m.notes || "").toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortOrder === "Default (Current First)") {
      list.sort((a, b) => {
        if (a.status === "current") return -1;
        if (b.status === "current") return 1;
        return new Date(b.completedAt) - new Date(a.completedAt);
      });
    } else if (sortOrder === "Ascending (1 → 9)") {
      list.sort((a, b) => a.seq - b.seq);
    } else {
      list.sort((a, b) => b.seq - a.seq);
    }

    return list;
  }, [milestones, statusFilter, sortOrder, search]);

  const activeFilters = [
    statusFilter !== "All Milestones"        ? statusFilter : null,
    sortOrder    !== "Ascending (1 → 9)"    ? sortOrder    : null,
  ].filter(Boolean);

  const currentMilestone = milestones.find(m => m.status === "current");

  return (
    <>
      <style>{`
        @keyframes pulse    { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.5; transform:scale(1.25); } }
        @keyframes scaleIn  { from { transform:scale(0.96); opacity:0 } to { transform:scale(1); opacity:1 } }
        * { box-sizing: border-box; }
        table { border-collapse: collapse; width: 100%; }
      `}</style>

      {/* ── Overall progress bar ──────────────────────────────── */}
      <div style={{
        background: T.cardBg, border: `1px solid ${T.gray200}`,
        borderRadius: "12px", padding: "16px 22px",
        marginBottom: "18px", display: "flex", alignItems: "center",
        gap: "20px", flexWrap: "wrap",
      }}>
        <div style={{ fontSize: "13px", fontWeight: "600", color: T.gray700, flexShrink: 0 }}>
          Overall Progress
        </div>
        <div style={{ flex: 1, minWidth: "160px" }}>
          <div style={{ height: "8px", borderRadius: "99px", background: T.gray200, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: "99px",
              background: `linear-gradient(90deg, ${T.blue}, #06B6D4)`,
              width: `${Math.round((completedCount / totalCount) * 100)}%`,
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>
        <span style={{ fontSize: "13px", fontWeight: "700", color: T.gray900, flexShrink: 0 }}>
          {completedCount} / {totalCount}
        </span>
        <span style={{ fontSize: "12px", color: T.gray500, flexShrink: 0 }}>
          {Math.round((completedCount / totalCount) * 100)}% complete
        </span>
        {currentMilestone && (
          <div style={{
            display: "flex", alignItems: "center", gap: "7px",
            background: "#F0FDF4", border: `1px solid ${T.greenBorder}`,
            borderRadius: "8px", padding: "6px 12px", flexShrink: 0,
          }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: T.green, display: "inline-block", animation: "pulse 1.8s ease-in-out infinite" }} />
            <span style={{ fontSize: "12px", fontWeight: "600", color: T.green }}>
              {currentMilestone.name}
            </span>
          </div>
        )}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: "12px", marginBottom: "14px", flexWrap: "wrap", position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>

          {/* Filter button */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setFilterOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                padding: "8px 16px",
                background: filterOpen ? T.blueBg : T.cardBg,
                border: `1px solid ${filterOpen ? T.blueBorder : T.gray200}`,
                borderRadius: "8px", fontSize: "13px", fontWeight: "500",
                color: filterOpen ? T.blue : T.gray700,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!filterOpen) { e.currentTarget.style.borderColor = T.gray300; e.currentTarget.style.background = T.gray50; } }}
              onMouseLeave={e => { if (!filterOpen) { e.currentTarget.style.borderColor = T.gray200; e.currentTarget.style.background = T.cardBg; } }}
            >
              <IcoFilter /> Filter &amp; Sort
              {activeFilters.length > 0 && (
                <span style={{ background: T.blue, color: "#fff", fontSize: "10px", fontWeight: "700", borderRadius: "99px", padding: "1px 6px", marginLeft: "2px" }}>
                  {activeFilters.length}
                </span>
              )}
            </button>

            {filterOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setFilterOpen(false)} />
                <FilterDropdown
                  statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                  sortOrder={sortOrder}       setSortOrder={setSortOrder}
                  onClose={() => setFilterOpen(false)}
                />
              </>
            )}
          </div>

          {/* Active chips */}
          {activeFilters.map(f => (
            <span key={f} style={{
              display: "flex", alignItems: "center", gap: "5px",
              fontSize: "12px", color: T.blue, background: T.blueBg,
              border: `1px solid ${T.blueBorder}`, borderRadius: "6px",
              padding: "4px 10px", fontWeight: "500",
            }}>
              {f}
              <span
                onClick={() => {
                  if (STATUS_OPTIONS.includes(f)) setStatusFilter("All Milestones");
                  if (SORT_OPTIONS.includes(f)) setSortOrder("Ascending (1 → 9)");
                }}
                style={{ cursor: "pointer", color: T.blueMid, lineHeight: 1 }}
              >×</span>
            </span>
          ))}

        </div>

        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: T.cardBg, border: `1px solid ${T.gray200}`,
          borderRadius: "8px", padding: "8px 14px", minWidth: "240px",
        }}>
          <IcoSearch />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search milestones..."
            style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px", color: T.gray700, flex: 1, fontFamily: "inherit" }}
          />
        </div>
      </div>

      {/* Default view notice */}
      {sortOrder === "Default (Current First)" && statusFilter === "All Milestones" && (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          fontSize: "12px", color: T.gray500, marginBottom: "10px",
          padding: "8px 14px", background: T.gray50,
          border: `1px solid ${T.gray200}`, borderRadius: "8px",
        }}>
          <IcoSort />
          Default view: current milestone on top, followed by completed milestones. Use Filter &amp; Sort to see all milestones.
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────── */}
      <div style={{
        background: T.cardBg, border: `1px solid ${T.gray200}`,
        borderRadius: "14px", overflow: "hidden",
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>MILESTONE</th>
                <th style={th}>STATUS</th>
                <th style={th}>EXPECTED DATE</th>
                <th style={th}>COMPLETED DATE</th>
                <th style={th}>COMPLETED BY</th>
                <th style={th}>NOTES</th>
                <th style={th}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "60px 20px", color: T.gray400, fontSize: "13px" }}>
                    No milestones match your filters.
                  </td>
                </tr>
              ) : (
                displayed.map(m => (
                  <MilestoneRow
                    key={m.id}
                    milestone={m}
                    isCurrent={m.status === "current"}
                    role={role}
                    shipment={shipment}
                    contacts={contacts}
                    onTakeAction={handleTakeAction}
                    router={router}
                    />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 18px", borderTop: `1px solid ${T.gray100}`,
          background: T.gray50, flexWrap: "wrap", gap: "8px",
        }}>
          <span style={{ fontSize: "12px", color: T.gray500 }}>
            Showing <strong style={{ color: T.gray700 }}>{displayed.length}</strong> of{" "}
            <strong style={{ color: T.gray700 }}>{totalCount}</strong> milestones
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: T.gray400 }}>Legend:</span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: T.green }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: T.green, display: "inline-block" }} />
              Current
            </span>
            <span style={{ fontSize: "11px", color: T.gray300 }}>·</span>
            <span style={{ fontSize: "11px", color: T.gray500 }}>Completed</span>
            <span style={{ fontSize: "11px", color: T.gray300 }}>·</span>
            <span style={{ fontSize: "11px", color: T.gray400 }}>Upcoming (hidden in default view)</span>
          </div>
        </div>
      </div>

      {/* Take Action navigates to mail creation page via router.push — no modal needed */}
    </>
  );
}