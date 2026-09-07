"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import MapErrorBoundary from "@/app/components/MapErrorBoundary";

const LeafletMap = dynamic(() => import("@/app/components/LeafletMap"), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000";

// ── Design tokens ─────────────────────────────────────────────
const T = {
  pageBg:      "#F1F5F9",
  cardBg:      "#FFFFFF",
  blue:        "#2563EB",
  blueBg:      "#EFF6FF",
  blueBorder:  "#BFDBFE",
  green:       "#16A34A",
  greenBg:     "#F0FDF4",
  greenBorder: "#BBF7D0",
  red:         "#DC2626",
  redBg:       "#FEF2F2",
  redBorder:   "#FECACA",
  amber:       "#D97706",
  amberBg:     "#FFFBEB",
  amberBorder: "#FDE68A",
  gray900:     "#0F172A",
  gray700:     "#334155",
  gray600:     "#475569",
  gray500:     "#64748B",
  gray400:     "#94A3B8",
  gray300:     "#CBD5E1",
  gray200:     "#E2E8F0",
  gray100:     "#F1F5F9",
  gray50:      "#F8FAFC",
  font:        "'DM Sans', -apple-system, sans-serif",
  mono:        "'JetBrains Mono', monospace",
};

// Departments are freight modes, matching shipments.transport_mode and the
// AIR/SEA department cards on the admin dashboard.
const DEPARTMENTS = ["Air", "Sea"];

const DEPT_THEME = {
  Air: { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  Sea: { color: "#0E7490", bg: "#ECFEFF", border: "#A5F3FC" },
};

// Approximate country centroids [lat, lng] to place map pins from country codes
// (shipments store no coordinates). ISO-2 codes + a few common aliases.
const COUNTRY_CENTROIDS = {
  LK:[7.9,80.8], IN:[22.0,79.0], US:[39.8,-98.6], USA:[39.8,-98.6],
  GB:[54.0,-2.0], UK:[54.0,-2.0], AU:[-25.3,133.8], DE:[51.2,10.4],
  FR:[46.2,2.2], SG:[1.35,103.8], AE:[24.0,54.0], UAE:[24.0,54.0],
  JP:[36.2,138.3], CN:[35.9,104.2], NL:[52.1,5.3], IT:[42.8,12.8],
  ES:[40.0,-3.7], CA:[56.1,-106.3], BR:[-14.2,-51.9], ZA:[-30.6,22.9],
  SA:[23.9,45.1], QA:[25.3,51.2], KW:[29.3,47.5], MY:[4.2,101.9],
  TH:[15.9,100.9], ID:[-0.8,113.9], VN:[14.1,108.3], KR:[35.9,127.8],
  HK:[22.3,114.2], NZ:[-40.9,174.9], PK:[30.4,69.3], BD:[23.7,90.4],
  EG:[26.8,30.8], TR:[38.9,35.2], BE:[50.5,4.5], SE:[60.1,18.6],
};
const cc = (code) => COUNTRY_CENTROIDS[(code || "").toUpperCase()] || null;

const SHIP_STATUS = {
  on_track: { label: "On Track", color: T.green, bg: T.greenBg, border: T.greenBorder },
  at_risk:  { label: "At Risk",  color: T.amber, bg: T.amberBg, border: T.amberBorder },
  overdue:  { label: "Overdue",  color: T.red,   bg: T.redBg,   border: T.redBorder   },
};

const PRIORITY = {
  critical: { label: "CRITICAL", color: "#991B1B", bg: "#FEE2E2", border: "#FECACA"     },
  high:     { label: "HIGH",     color: T.amber,   bg: T.amberBg, border: T.amberBorder },
  normal:   { label: "Normal",   color: T.gray500, bg: T.gray100, border: T.gray300     },
};

const IcoShip  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 21c.6.5 1.2 1 2.5 1C7 22 7 20 9.5 20c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7l-7-3L5 7v6"/><polyline points="12 4 12 10"/></svg>;
const IcoAlert = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcoTeam  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoCheck = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoMap   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
const IcoMail  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;

function StatCard({ icon, label, value, sub, color, bg, border }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ background: T.cardBg, border: `1px solid ${hov ? border : T.gray200}`, borderRadius: "14px", padding: "18px 20px", flex: 1, minWidth: "130px", boxShadow: hov ? "0 4px 20px rgba(0,0,0,0.08)" : "0 1px 4px rgba(0,0,0,0.04)", transition: "all 0.18s ease", transform: hov ? "translateY(-2px)" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", color }}>{icon}</div>
        {sub && <span style={{ fontSize: "10px", color: T.gray400, background: T.gray100, border: `1px solid ${T.gray200}`, padding: "2px 7px", borderRadius: "99px" }}>{sub}</span>}
      </div>
      <div style={{ fontSize: "26px", fontWeight: "800", color: T.gray900, lineHeight: 1.1, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: "11px", color: T.gray500, marginTop: "4px", fontWeight: "500" }}>{label}</div>
    </div>
  );
}

function TeamRow({ member, deptColor }) {
  const sc = { active: { color: T.green, bg: T.greenBg, border: T.greenBorder, label: "Active" }, busy: { color: T.amber, bg: T.amberBg, border: T.amberBorder, label: "Busy" }, away: { color: T.gray400, bg: T.gray100, border: T.gray300, label: "Away" } }[member.status];
  const initials = member.name.split(" ").map(w => w[0]).join("").slice(0, 2);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 16px", borderBottom: `1px solid ${T.gray100}` }}>
      <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: T.blueBg, border: `1.5px solid ${T.blueBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: deptColor, flexShrink: 0 }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "12px", fontWeight: "600", color: T.gray900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{member.name}</div>
        <div style={{ fontSize: "11px", color: T.gray500 }}>{member.role}</div>
      </div>
      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <div style={{ fontSize: "15px", fontWeight: "700", color: T.gray900 }}>{member.shipments}</div>
        <div style={{ fontSize: "9px", color: T.gray400 }}>ships</div>
      </div>
      <div style={{ textAlign: "center", flexShrink: 0, marginLeft: "6px" }}>
        <div style={{ fontSize: "15px", fontWeight: "700", color: member.alerts > 0 ? T.red : T.green }}>{member.alerts}</div>
        <div style={{ fontSize: "9px", color: T.gray400 }}>alerts</div>
      </div>
      <span style={{ fontSize: "10px", fontWeight: "600", color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, padding: "2px 8px", borderRadius: "99px", flexShrink: 0 }}>{sc.label}</span>
    </div>
  );
}

const td = { padding: "12px 14px", verticalAlign: "middle", borderBottom: `1px solid ${T.gray100}` };
const th = { padding: "10px 14px", textAlign: "left", fontSize: "10px", fontWeight: "700", color: T.gray500, letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: `1px solid ${T.gray200}`, background: T.gray50, whiteSpace: "nowrap" };

function ShipRow({ ship, router }) {
  const [hov, setHov] = useState(false);
  const ss = SHIP_STATUS[ship.status];
  const pr = PRIORITY[ship.priority];
  return (
    <tr onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={() => router.push(`/admin/shipment_milestones?id=${ship.id}`)} style={{ background: hov ? T.gray50 : T.cardBg, cursor: "pointer", transition: "background 0.13s" }}>
      <td style={td}><span style={{ fontFamily: T.mono, fontSize: "11px", fontWeight: "600", color: T.blue, background: T.blueBg, border: `1px solid ${T.blueBorder}`, padding: "2px 8px", borderRadius: "4px" }}>{ship.id}</span></td>
      <td style={td}><span style={{ fontSize: "13px", fontWeight: "500", color: T.gray900 }}>{ship.client}</span></td>
      <td style={td}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: T.gray700 }}>{ship.route}</span>
          <span style={{ fontSize: "10px", fontWeight: "600", color: T.blue, background: T.blueBg, border: `1px solid ${T.blueBorder}`, padding: "1px 6px", borderRadius: "3px" }}>{ship.type}</span>
        </div>
      </td>
      <td style={td}><span style={{ fontSize: "12px", color: T.gray600 }}>{ship.milestone}</span></td>
      <td style={td}><span style={{ fontSize: "10px", fontWeight: "700", color: pr.color, background: pr.bg, border: `1px solid ${pr.border}`, padding: "2px 8px", borderRadius: "4px", letterSpacing: "0.04em" }}>{pr.label}</span></td>
      <td style={td}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: ss.color, display: "inline-block" }} />
          <span style={{ fontSize: "12px", fontWeight: "600", color: ss.color }}>{ss.label}</span>
        </div>
      </td>
      <td style={td}><span style={{ fontSize: "12px", color: T.gray500 }}>{ship.eta}</span></td>
      <td style={td}><span style={{ fontSize: "12px", color: T.gray600 }}>{ship.assignee}</span></td>
    </tr>
  );
}

export default function DepartmentOverviewPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const rawDept      = searchParams.get("dept") || "Air";
  // Tolerate ?dept=AIR / air / "Air Freight" as well as the exact labels.
  const deptParam    = DEPARTMENTS.find(d => rawDept.toUpperCase().includes(d.toUpperCase())) || "Air";

  const [activeDept,  setActiveDept]  = useState(deptParam);
  const [selectedPin, setSelectedPin] = useState(null);
  const [shipFilter,  setShipFilter]  = useState("all");

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/dashboard/department-overview?dept=${activeDept}`)
      .then(r => r.json())
      .then(res => setData(res.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [activeDept]);

  const theme = DEPT_THEME[activeDept];
  const dept = useMemo(() => {
    const d = data || {};
    const stats = { totalShipments: 0, activeShipments: 0, completedToday: 0, overdueAlerts: 0,
                    pendingAlerts: 0, resolvedToday: 0, teamMembers: 0, ...(d.stats || {}) };
    const shipments = d.shipments || [];
    const mapPins = [], routes = [];
    shipments.forEach(sh => {
      const to = cc(sh.dest_cc), from = cc(sh.origin_cc) || cc("LK");
      if (to) {
        mapPins.push({ lat: to[0], lng: to[1], id: sh.id, label: sh.label || sh.client, status: sh.status, route: sh.route });
        if (from) routes.push({ from, to, id: sh.id, status: sh.status });
      }
    });
    return { ...theme, head: d.head, headEmail: d.headEmail, stats, team: d.team || [], shipments, mapPins, routes };
  }, [data, theme]);

  const s             = dept.stats;
  const filteredShips = dept.shipments.filter(sh => shipFilter === "all" || sh.status === shipFilter);
  const pinnedShip    = selectedPin ? dept.shipments.find(sh => sh.id === selectedPin) : null;

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: T.font, color: T.gray900, padding: "28px 28px 80px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        table { border-collapse: collapse; width: 100%; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span onClick={() => router.push("/admin")} style={{ fontSize: "12px", color: T.blue, fontWeight: "500", cursor: "pointer" }} onMouseEnter={e => e.target.style.textDecoration = "underline"} onMouseLeave={e => e.target.style.textDecoration = "none"}>Admin</span>
            <span style={{ color: T.gray300 }}>›</span>
            <span style={{ fontSize: "12px", color: T.gray500 }}>Department Overview</span>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: T.gray900, letterSpacing: "-0.02em", marginBottom: "4px" }}>{activeDept} Department</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", color: T.gray500 }}>Head:</span>
            <span style={{ fontSize: "13px", fontWeight: "600", color: dept.color }}>{dept.head}</span>
            <span style={{ fontSize: "12px", color: T.gray400 }}>·</span>
            <span style={{ fontSize: "12px", color: T.gray400, display: "flex", alignItems: "center", gap: "4px" }}><IcoMail /> {dept.headEmail}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", background: T.gray100, padding: "4px", borderRadius: "10px" }}>
          {DEPARTMENTS.map(d => {
            const isActive = activeDept === d;
            return (
              <button key={d} onClick={() => { setActiveDept(d); setSelectedPin(null); setShipFilter("all"); }} style={{ padding: "8px 20px", borderRadius: "8px", border: "none", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: T.font, background: isActive ? T.cardBg : "transparent", color: isActive ? DEPT_THEME[d].color : T.gray500, boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <StatCard icon={<IcoShip />}  label="Active Shipments" value={s.activeShipments} sub={`${s.totalShipments} total`} color={dept.color} bg={dept.bg} border={dept.border} />
        <StatCard icon={<IcoCheck />} label="Completed Today"  value={s.completedToday}  color={T.green} bg={T.greenBg} border={T.greenBorder} />
        <StatCard icon={<IcoAlert />} label="Overdue Alerts"   value={s.overdueAlerts}   color={T.red}   bg={T.redBg}   border={T.redBorder}   />
        <StatCard icon={<IcoAlert />} label="Pending Alerts"   value={s.pendingAlerts}   color={T.amber} bg={T.amberBg} border={T.amberBorder} />
        <StatCard icon={<IcoCheck />} label="Resolved Today"   value={s.resolvedToday}   color={T.green} bg={T.greenBg} border={T.greenBorder} />
        <StatCard icon={<IcoTeam />}  label="Team Members"     value={s.teamMembers}     color={dept.color} bg={dept.bg} border={dept.border} />
      </div>

      {/* Map + Team */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "20px", alignItems: "flex-start" }}>

        {/* Map card */}
        <div style={{ flex: 2, minWidth: 0, background: T.cardBg, border: `1px solid ${T.gray200}`, borderRadius: "14px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: dept.color }}><IcoMap /></span>
              <span style={{ fontSize: "14px", fontWeight: "700", color: T.gray900 }}>Live Shipment Map</span>
              <span style={{ fontSize: "11px", color: T.gray400, background: T.gray100, padding: "2px 8px", borderRadius: "99px" }}>{dept.mapPins.length} active routes</span>
            </div>
            {selectedPin && (
              <button onClick={() => setSelectedPin(null)} style={{ fontSize: "11px", color: T.gray500, background: T.gray100, border: "none", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontFamily: T.font }}>
                Clear ×
              </button>
            )}
          </div>

          {/* ✅ Single LeafletMap instance, wrapped in MapErrorBoundary */}
          <div style={{ height: "400px", borderRadius: "10px", overflow: "hidden", border: `1px solid ${T.gray200}` }}>
            <MapErrorBoundary>
              <LeafletMap
                pins={dept.mapPins}
                routes={dept.routes}
                selectedPin={selectedPin}
                onPinClick={(id) => setSelectedPin(prev => prev === id ? null : id)}
              />
            </MapErrorBoundary>
          </div>

          {pinnedShip && (
            <div style={{ marginTop: "12px", padding: "12px 16px", background: T.blueBg, border: `1px solid ${T.blueBorder}`, borderRadius: "10px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", animation: "fadeIn 0.18s ease" }}>
              <span style={{ fontFamily: T.mono, fontSize: "11px", color: T.blue, fontWeight: "600" }}>{pinnedShip.id}</span>
              <span style={{ fontSize: "13px", fontWeight: "600", color: T.gray900 }}>{pinnedShip.client}</span>
              <span style={{ fontSize: "12px", color: T.gray600 }}>{pinnedShip.route}</span>
              <span style={{ fontSize: "12px", color: T.gray500 }}>{pinnedShip.milestone}</span>
              <button onClick={() => router.push(`/admin/shipment_milestones?id=${pinnedShip.id}`)} style={{ marginLeft: "auto", fontSize: "12px", fontWeight: "600", color: T.blue, background: T.cardBg, border: `1px solid ${T.blueBorder}`, borderRadius: "7px", padding: "5px 12px", cursor: "pointer", fontFamily: T.font }}>
                View Milestones →
              </button>
            </div>
          )}
        </div>

        {/* Team card */}
        <div style={{ width: "290px", flexShrink: 0, background: T.cardBg, border: `1px solid ${T.gray200}`, borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "16px", borderBottom: `1px solid ${T.gray100}`, display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: dept.color }}><IcoTeam /></span>
            <span style={{ fontSize: "14px", fontWeight: "700", color: T.gray900 }}>Team</span>
            <span style={{ fontSize: "11px", color: T.gray400, background: T.gray100, padding: "2px 8px", borderRadius: "99px", marginLeft: "auto" }}>{dept.team.length} members</span>
          </div>
          {dept.team.map((m, i) => <TeamRow key={i} member={m} deptColor={dept.color} />)}
          <div style={{ padding: "14px 16px", background: T.gray50, borderTop: `1px solid ${T.gray100}` }}>
            <div style={{ fontSize: "10px", color: T.gray500, marginBottom: "10px", fontWeight: "700", letterSpacing: "0.06em" }}>WORKLOAD</div>
            {dept.team.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "10px", color: T.gray600, width: "72px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name.split(" ")[0]}</span>
                <div style={{ flex: 1, height: "5px", borderRadius: "99px", background: T.gray200, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: "99px", width: `${Math.min((m.shipments / 8) * 100, 100)}%`, background: m.shipments >= 5 ? T.red : m.shipments >= 3 ? T.amber : T.green }} />
                </div>
                <span style={{ fontSize: "10px", color: T.gray500, width: "10px", textAlign: "right" }}>{m.shipments}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shipments table */}
      <div style={{ background: T.cardBg, border: `1px solid ${T.gray200}`, borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.gray100}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: dept.color }}><IcoShip /></span>
            <span style={{ fontSize: "14px", fontWeight: "700", color: T.gray900 }}>Ongoing Shipments</span>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {[["all","All"],["overdue","Overdue"],["at_risk","At Risk"],["on_track","On Track"]].map(([val, label]) => {
              const active = shipFilter === val;
              return (
                <button key={val} onClick={() => setShipFilter(val)} style={{ padding: "5px 14px", borderRadius: "99px", border: `1px solid ${active ? dept.border : T.gray200}`, background: active ? dept.bg : T.cardBg, color: active ? dept.color : T.gray500, fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: T.font, transition: "all 0.13s" }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr>{["Shipment ID","Client","Route","Current Milestone","Priority","Status","ETA","Assignee"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {filteredShips.length === 0
                ? <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px", color: T.gray400, fontSize: "13px" }}>No shipments match this filter.</td></tr>
                : filteredShips.map(sh => <ShipRow key={sh.id} ship={sh} router={router} />)
              }
            </tbody>
          </table>
        </div>
        <div style={{ padding: "11px 18px", borderTop: `1px solid ${T.gray100}`, background: T.gray50, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "12px", color: T.gray500 }}>Showing <strong style={{ color: T.gray700 }}>{filteredShips.length}</strong> of <strong style={{ color: T.gray700 }}>{dept.shipments.length}</strong> shipments</span>
          <span style={{ fontSize: "11px", color: T.gray400 }}>Click any row to view milestones</span>
        </div>
      </div>
    </div>
  );
}