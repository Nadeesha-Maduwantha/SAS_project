"use client";

// =============================================================
//  File path: app/(protected)/admin/shipment_milestones/page.jsx
//  (Also used by operation_user, sales_user, Super_user —
//   copy this file to their equivalent folder and change ROLE)
//
//  Role       | Folder
//  -----------|----------------------------------------------
//  admin      | (protected)/admin/shipment_milestones/page.jsx
//  super_user | (protected)/Super_user/shipment_milestones/page.jsx
//  operations | (protected)/operation_user/shipment_milestones/page.jsx
//  sales      | (protected)/sales_user/shipment_milestones/page.jsx
//
//  Only the ROLE constant and the shipment/contacts data change.
//  Everything else is shared via MilestonesTable.
// =============================================================

import { T } from "@/styles/tokens";
import MilestonesTable from "./components/MilestonesTable";

// ── Change this per role folder ───────────────────────────────
const ROLE = "sales_user";
// Options: "admin" | "super_user" | "operations_user" | "sales_user"

// ── Dummy data — replace with API fetch using shipment ID ─────
// In production: const shipment = await fetchShipment(params.id);
//                const milestones = await fetchMilestones(params.id);

const SHIPMENT = {
  id:       "SHP-2024-0892",
  client:   "Oceanic Traders Ltd",
  route:    "LK → USA",
  type:     "Air Freight",
  template: "Standard Air Freight",
};

// Contacts — who to email depending on role
const CONTACTS = {
  operationsUser: { name: "Amal Perera",             email: "amal.perera@dartglobal.com"     },
  carrier:        { name: "Star Shipping Line",       email: "ops@starshipping.com"            },
  client:         { name: "Oceanic Traders Ltd",      email: "logistics@oceanictraders.com"    },
};

const MILESTONES = [
  { id: "ms1", seq: 1, name: "Booking Confirmation",    status: "completed", automated: true,  critical: false, completedAt: "2025-01-10", expectedDate: "2025-01-10", completedBy: "System",      notes: ""                          },
  { id: "ms2", seq: 2, name: "Cargo Ready Date",         status: "completed", automated: false, critical: false, completedAt: "2025-01-13", expectedDate: "2025-01-13", completedBy: "Amal Perera", notes: ""                          },
  { id: "ms3", seq: 3, name: "Pickup from Shipper",      status: "completed", automated: false, critical: false, completedAt: "2025-01-14", expectedDate: "2025-01-14", completedBy: "Amal Perera", notes: "Collected at 09:30 AM"     },
  { id: "ms4", seq: 4, name: "Export Customs Clearance", status: "completed", automated: false, critical: false, completedAt: "2025-01-15", expectedDate: "2025-01-15", completedBy: "Nimal Silva", notes: ""                          },
  { id: "ms5", seq: 5, name: "Departure from Origin",    status: "current",   automated: false, critical: true,  completedAt: null,         expectedDate: "2025-01-17", completedBy: null,          notes: "", daysRemaining: 1         },
  { id: "ms6", seq: 6, name: "In Transit / En Route",    status: "upcoming",  automated: true,  critical: false, completedAt: null,         expectedDate: "2025-01-18", completedBy: null,          notes: "", daysRemaining: 2         },
  { id: "ms7", seq: 7, name: "Arrival at Destination",   status: "upcoming",  automated: false, critical: true,  completedAt: null,         expectedDate: "2025-01-20", completedBy: null,          notes: "", daysRemaining: 4         },
  { id: "ms8", seq: 8, name: "Import Customs Clearance", status: "upcoming",  automated: false, critical: false, completedAt: null,         expectedDate: "2025-01-21", completedBy: null,          notes: "", daysRemaining: 5         },
  { id: "ms9", seq: 9, name: "Delivery to Consignee",    status: "upcoming",  automated: false, critical: false, completedAt: null,         expectedDate: "2025-01-22", completedBy: null,          notes: "", daysRemaining: 6         },
];

// ── Role display labels ───────────────────────────────────────
const ROLE_META = {
  admin:           { label: "Admin",            color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  super_user:      { label: "Super User",       color: T.blue,    bg: T.blueBg,  border: T.blueBorder },
  operations_user: { label: "Operations User",  color: T.green,   bg: T.greenBg, border: T.greenBorder },
  sales_user:      { label: "Sales User",       color: T.amber,   bg: T.amberBg, border: T.amberBorder },
};

// ── Page ──────────────────────────────────────────────────────

export default function ShipmentMilestonesPage() {
  const rm = ROLE_META[ROLE] || ROLE_META.admin;

  return (
    <div style={{
      minHeight:  "100vh",
      background: T.pageBg,
      fontFamily: "'Inter', -apple-system, sans-serif",
      color:      T.gray900,
      padding:    "32px 32px 80px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
      `}</style>

      {/* ── Page header ───────────────────────────────────────── */}
      <div style={{ marginBottom: "20px" }}>

        {/* Role badge */}
        <div style={{ marginBottom: "10px" }}>
          <span style={{
            fontSize:     "11px",
            fontWeight:   "700",
            color:        rm.color,
            background:   rm.bg,
            border:       `1px solid ${rm.border}`,
            padding:      "3px 10px",
            borderRadius: "5px",
            letterSpacing:"0.05em",
          }}>
            {rm.label}
          </span>
        </div>

        <h1 style={{ fontSize: "21px", fontWeight: "700", color: T.gray900, letterSpacing: "-0.015em", marginBottom: "8px" }}>
          Shipment Milestones
        </h1>

        {/* Shipment meta */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span style={{
            fontFamily:   "'IBM Plex Mono', monospace",
            fontSize:     "12px", fontWeight: "600",
            color:        T.blue, background: T.blueBg,
            border:       `1px solid ${T.blueBorder}`,
            padding:      "3px 10px", borderRadius: "5px",
          }}>
            {SHIPMENT.id}
          </span>
          <span style={{ fontSize: "13px", color: T.gray700, fontWeight: "500" }}>{SHIPMENT.client}</span>
          <span style={{ fontSize: "12px", color: T.gray400 }}>·</span>
          <span style={{ fontSize: "13px", color: T.gray500 }}>{SHIPMENT.route}</span>
          <span style={{ fontSize: "12px", color: T.gray400 }}>·</span>
          <span style={{
            fontSize: "12px", color: T.blue, background: T.blueBg,
            border: `1px solid ${T.blueBorder}`, padding: "2px 9px", borderRadius: "5px", fontWeight: "500",
          }}>
            {SHIPMENT.type}
          </span>
          <span style={{ fontSize: "12px", color: T.gray400 }}>·</span>
          <span style={{ fontSize: "12px", color: T.gray500 }}>
            Template: <strong style={{ color: T.gray700 }}>{SHIPMENT.template}</strong>
          </span>
        </div>
      </div>

      {/* ── Milestones table (all logic lives here) ───────────── */}
      <MilestonesTable
        role={ROLE}
        shipment={SHIPMENT}
        milestones={MILESTONES}
        contacts={CONTACTS}
      />
    </div>
  );
}