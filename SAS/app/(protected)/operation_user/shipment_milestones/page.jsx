"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { T } from "@/styles/tokens";
import MilestonesTable from "./components/MilestonesTable";

const ROLE = "operation";

const ROLE_META = {
  admin:           { label: "Admin",           color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  super_user:      { label: "Super User",      color: T.blue,    bg: T.blueBg,  border: T.blueBorder },
  operations_user: { label: "Operations User", color: T.green,   bg: T.greenBg, border: T.greenBorder },
  sales_user:      { label: "Sales User",      color: T.amber,   bg: T.amberBg, border: T.amberBorder },
};

function buildRoute(originCity, originCode, destCity, destCode) {
  const origin = [originCity, originCode].filter(Boolean).join(", ");
  const dest   = [destCity,   destCode  ].filter(Boolean).join(", ");
  if (!origin && !dest) return "—";
  if (!origin) return dest;
  if (!dest)   return origin;
  return `${origin} → ${dest}`;
}

function buildContacts(shipment) {
  if (!shipment) return {};
  return {
    operationsUser: {
      name:  shipment.created_by_name  ?? "—",
      email: shipment.created_by_email ?? "—",
    },
    carrier: {
      name:  shipment.carrier ?? "—",
      email: "",
    },
    client: {
      name:  shipment.consignee_name  ?? "—",
      email: shipment.consignee_email ?? "—",
    },
    salesUser: {
      name:  shipment.sales_user_name  ?? "—",
      email: shipment.sales_user_email ?? "—",
    },
  };
}

export default function ShipmentMilestonesPage() {
  const searchParams = useSearchParams();

  const shipmentId = searchParams.get("id");
  const jobNumber  = searchParams.get("job");

  // ── State ──────────────────────────────────────────────────
  const [shipment,   setShipment]   = useState(null);
  const [milestones, setMilestones] = useState([]);  // ← real milestones from DB
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // ── Fetch ──────────────────────────────────────────────────
  useEffect(() => {
    if (!shipmentId && !jobNumber) {
      setError("No shipment ID provided in the URL.");
      setLoading(false);
      return;
    }

    const fetchShipment = async () => {
      try {
        const url = shipmentId
          ? `http://localhost:5000/api/shipments/${shipmentId}`
          : `http://localhost:5000/api/shipments/job/${jobNumber}`;

        const response = await fetch(url);
        const result   = await response.json();

        if (response.ok) {
          // ✅ Flask now returns { data: { shipment, milestones } }
          setShipment(result.data.shipment);
          setMilestones(result.data.milestones ?? []);
        } else {
          setError(result.error || "Shipment not found");
        }
      } catch (err) {
        setError("Could not connect to server. Is Flask running on port 5000?");
      } finally {
        setLoading(false);
      }
    };

    fetchShipment();
  }, [shipmentId, jobNumber]);

  // ── Map DB milestones to what MilestonesTable expects ──────
  const mappedMilestones = milestones.map((m, index) => {
    const firstPendingIndex = milestones.findIndex(ms => ms.status !== "completed");

    let status;
    if (m.status === "completed") {
      status = "completed";
    } else if (index === firstPendingIndex) {
      status = "current";    // first pending = currently active
    } else {
      status = "upcoming";   // rest are upcoming
    }

    return {
      id:           m.id,
      seq:          m.sequence_order + 1,
      name:         m.name,
      status,
      critical:     m.is_critical    ?? false,
      automated:    m.automated      ?? false,
      expectedDate: m.due_date,
      completedAt:  m.completed_date,
      completedBy:  m.assigned_to,
      notes:        m.notes          ?? "",
      daysRemaining: null,
    };
  });

  // ── Derived shipment meta ───────────────────────────────────
  const shipmentMeta = {
    id:       shipment?.job_number        ?? shipment?.id ?? "—",
    client:   shipment?.consignee_name    ?? "—",
    route:    buildRoute(
                shipment?.origin_city,
                shipment?.origin_country_code,
                shipment?.destination_city,
                shipment?.destination_country_code
              ),
    type:     shipment?.transport_mode    ?? "—",
    template: shipment?.st_description   ?? "CargoWise Milestones",
    branch:   shipment?.branch            ?? "—",
    hbl:      shipment?.house_bill_number ?? "—",
  };

  const contacts = buildContacts(shipment);
  const rm       = ROLE_META[ROLE] || ROLE_META.admin;

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
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ marginBottom: "10px" }}>
          <span style={{
            fontSize: "11px", fontWeight: "700",
            color: rm.color, background: rm.bg, border: `1px solid ${rm.border}`,
            padding: "3px 10px", borderRadius: "5px", letterSpacing: "0.05em",
          }}>
            {rm.label}
          </span>
        </div>

        <h1 style={{ fontSize: "21px", fontWeight: "700", color: T.gray900, letterSpacing: "-0.015em", marginBottom: "8px" }}>
          Shipment Milestones
        </h1>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "16px", height: "16px", borderRadius: "50%",
              border: `2px solid ${T.gray200}`, borderTopColor: T.blue,
              animation: "spin 0.7s linear infinite",
            }} />
            <span style={{ fontSize: "13px", color: T.gray400 }}>Loading shipment...</span>
          </div>
        ) : error ? (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "8px 14px", background: "#fef2f2",
            border: "1px solid #fecaca", borderRadius: "8px",
            fontSize: "13px", color: "#dc2626",
          }}>
            ⚠ {error}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "12px", fontWeight: "600",
              color: T.blue, background: T.blueBg,
              border: `1px solid ${T.blueBorder}`,
              padding: "3px 10px", borderRadius: "5px",
            }}>
              {shipmentMeta.id}
            </span>
            <span style={{ fontSize: "13px", color: T.gray700, fontWeight: "500" }}>
              {shipmentMeta.client}
            </span>
            <span style={{ fontSize: "12px", color: T.gray300 }}>·</span>
            <span style={{ fontSize: "13px", color: T.gray500 }}>
              {shipmentMeta.route}
            </span>
            <span style={{ fontSize: "12px", color: T.gray300 }}>·</span>
            <span style={{
              fontSize: "12px", color: T.blue, background: T.blueBg,
              border: `1px solid ${T.blueBorder}`,
              padding: "2px 9px", borderRadius: "5px", fontWeight: "500",
            }}>
              {shipmentMeta.type}
            </span>
            {shipmentMeta.branch !== "—" && (
              <>
                <span style={{ fontSize: "12px", color: T.gray300 }}>·</span>
                <span style={{ fontSize: "12px", color: T.gray500 }}>
                  Branch: <strong style={{ color: T.gray700 }}>{shipmentMeta.branch}</strong>
                </span>
              </>
            )}
            {shipmentMeta.hbl !== "—" && (
              <>
                <span style={{ fontSize: "12px", color: T.gray300 }}>·</span>
                <span style={{ fontSize: "12px", color: T.gray500 }}>
                  HBL: <strong style={{ color: T.gray700 }}>{shipmentMeta.hbl}</strong>
                </span>
              </>
            )}
            {shipment?.pickup_date_status && (
              <>
                <span style={{ fontSize: "12px", color: T.gray300 }}>·</span>
                <span style={{
                  fontSize: "11px", fontWeight: "600",
                  padding: "2px 9px", borderRadius: "5px",
                  background: shipment.pickup_date_status.toLowerCase().includes("overdue") ? "#fef2f2" : "#f0fdf4",
                  color:      shipment.pickup_date_status.toLowerCase().includes("overdue") ? "#dc2626" : "#15803d",
                  border:     shipment.pickup_date_status.toLowerCase().includes("overdue") ? "1px solid #fecaca" : "1px solid #bbf7d0",
                }}>
                  {shipment.pickup_date_status}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Milestones Table */}
      <MilestonesTable
        role={ROLE}
        shipment={shipmentMeta}
        milestones={loading ? [] : mappedMilestones}
        contacts={contacts}
        loading={loading}
        error={error}
      />
    </div>
  );
}