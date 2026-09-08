"use client";

// =============================================================
//  MilestoneSequenceView.jsx
//  Path: components/milestones/MilestoneSequenceView.jsx
//
//  Read-only display of a milestone sequence.
//
//  Props:
//    milestones  — array of milestone objects (sorted by sequence_order)
//    loading     — bool, shows skeleton while fetching
//    error       — string | null, shows error state
// =============================================================

import { T } from "@/styles/tokens";

// ── Badge ──────────────────────────────────────────────────────────────────────
function Badge({ text, color, bg, border }) {
  return (
    <span style={{
      fontSize: "10px", fontWeight: "700",
      color, background: bg, border: `1px solid ${border}`,
      padding: "2px 7px", borderRadius: "4px",
      letterSpacing: "0.05em", whiteSpace: "nowrap",
    }}>
      {text}
    </span>
  );
}

// ── Single milestone card (view only) ─────────────────────────────────────────
function MilestoneViewCard({ milestone, index }) {
  return (
    <div style={{
      background: T.cardBg,
      border: milestone.is_critical
        ? `1px solid ${T.redBorder}`
        : T.cardBorder,
      borderRadius: "10px",
      padding: "12px 14px",
      transition: "box-shadow 0.15s",
    }}>
      {/* Index + badges row */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "7px", flexWrap: "wrap" }}>
        <span style={{
          fontFamily: T.mono, fontSize: "10px", fontWeight: "600",
          color: T.blue, background: T.blueBg,
          border: `1px solid ${T.blueBorder}`,
          padding: "2px 7px", borderRadius: "4px",
          letterSpacing: "0.04em", flexShrink: 0,
        }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        {milestone.is_critical  && <Badge text="CRITICAL" color={T.red}    bg={T.redBg}   border={T.redBorder} />}
        {milestone.automated    && <Badge text="AUTO"     color={T.gray500} bg={T.gray100} border={T.gray300}  />}
      </div>

      {/* Name */}
      <div style={{ fontSize: "12px", fontWeight: "600", color: T.gray900, lineHeight: "1.4", marginBottom: "5px" }}>
        {milestone.name}
      </div>

      {/* Footer */}
      <div style={{ fontSize: "11px", color: T.gray400 }}>
        Expected date
        {(milestone.vars ?? []).length > 0
          ? ` + ${milestone.vars.length} variable${milestone.vars.length > 1 ? "s" : ""}`
          : ""}
      </div>
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} style={{
          background: T.gray100, borderRadius: "10px", padding: "12px 14px", height: "80px",
          animation: "pulse 1.5s ease-in-out infinite",
        }} />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MilestoneSequenceView({ milestones = [], loading = false, error = null }) {
  return (
    <>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <div style={{
          padding: "20px 24px", background: T.redBg,
          border: `1px solid ${T.redBorder}`, borderRadius: "10px",
          fontSize: "13px", color: T.red, lineHeight: "1.6",
        }}>
          <strong>Could not load milestones.</strong>
          <br />
          <span style={{ fontSize: "12px", color: T.gray500 }}>{error}</span>
        </div>
      ) : milestones.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "52px 20px",
          border: `1.5px dashed ${T.gray200}`, borderRadius: "10px", textAlign: "center",
        }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "10px",
            background: T.gray100, display: "flex",
            alignItems: "center", justifyContent: "center", marginBottom: "12px",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.gray400} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6"  x2="21"   y2="6"  />
              <line x1="8" y1="12" x2="21"   y2="12" />
              <line x1="8" y1="18" x2="21"   y2="18" />
              <line x1="3" y1="6"  x2="3.01" y2="6"  />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </div>
          <div style={{ fontSize: "14px", fontWeight: "600", color: T.gray500, marginBottom: "6px" }}>
            No milestones in this template
          </div>
          <div style={{ fontSize: "12px", color: T.gray400, maxWidth: "220px", lineHeight: "1.6" }}>
            Switch to edit mode to start building the milestone sequence.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {milestones.map((m, i) => (
            <MilestoneViewCard key={m.id ?? i} milestone={m} index={i} />
          ))}
        </div>
      )}
    </>
  );
}