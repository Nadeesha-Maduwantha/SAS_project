// =============================================================
//  Shared components for milestone template pages
//  Path: src/components/templateComponents.jsx
//
//  Used by:
//    src/app/templates/[id]/page.jsx        (view/edit template)
//    src/app/templates/create/page.jsx      (create new template)
// =============================================================
"use client";

import { useState } from "react";
import { T, solidBtn, outlineBtn, ghostBtn, inp, lbl } from "@/styles/tokens";
// =============================================================
//  ICONS
// =============================================================

export const IcoEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const IcoPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const IcoTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

export const IcoCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const IcoX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const IcoGrip = () => (
  <svg width="11" height="16" viewBox="0 0 12 20" fill={T.gray300}>
    <circle cx="4" cy="4"  r="1.6" />
    <circle cx="8" cy="4"  r="1.6" />
    <circle cx="4" cy="10" r="1.6" />
    <circle cx="8" cy="10" r="1.6" />
    <circle cx="4" cy="16" r="1.6" />
    <circle cx="8" cy="16" r="1.6" />
  </svg>
);

export const IcoWarn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9"  x2="12"    y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const IcoTruck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" />
    <path d="M16 8h4l3 3v5h-7V8z" />
    <circle cx="5.5"  cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

export const IcoCheckList = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

export const IcoBranch = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="3" x2="6" y2="15" />
    <circle cx="18" cy="6"  r="3" />
    <circle cx="6"  cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </svg>
);

// =============================================================
//  BADGE
// =============================================================

export function Badge({ text, color, bg, border }) {
  return (
    <span style={{
      fontSize:      "10px",
      fontWeight:    "700",
      color,
      background:    bg,
      border:        `1px solid ${border}`,
      padding:       "2px 7px",
      borderRadius:  "4px",
      letterSpacing: "0.05em",
      whiteSpace:    "nowrap",
    }}>
      {text}
    </span>
  );
}

// =============================================================
//  SECTION HEADING
// =============================================================

export function SectionHead({ title, pill }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
      <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: T.gray900 }}>
        {title}
      </h2>
      {pill && (
        <span style={{
          fontSize:      "11px",
          fontWeight:    "600",
          color:         T.blue,
          background:    T.blueBg,
          border:        `1px solid ${T.blueBorder}`,
          padding:       "3px 10px",
          borderRadius:  "20px",
        }}>
          {pill}
        </span>
      )}
    </div>
  );
}

// =============================================================
//  DIVIDER
// =============================================================

export function Divider() {
  return <div style={{ borderTop: `1px solid ${T.gray200}`, margin: "20px 0" }} />;
}

// =============================================================
//  TOGGLE CHECKBOX
// =============================================================

export function ToggleCheck({ label, checked, onChange, color, bg }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" }}
    >
      <div style={{
        width:          "16px",
        height:         "16px",
        borderRadius:   "4px",
        border:         `1.5px solid ${checked ? color : T.gray300}`,
        background:     checked ? bg : T.cardBg,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        transition:     "all 0.15s",
        flexShrink:     0,
      }}>
        {checked && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <polyline points="2,6 5,9 10,3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: "12px", color: checked ? color : T.gray700 }}>{label}</span>
    </div>
  );
}

// =============================================================
//  MILESTONE CARD  (drag-and-drop capable)
// =============================================================

export function MilestoneCard({ milestone, index, editMode, onDragStart, onDragOver, onDrop, onDragEnd, isDragOver, onRemove }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      draggable={editMode}
      onDragStart={editMode ? onDragStart : undefined}
      onDragOver={editMode ? (e) => { e.preventDefault(); onDragOver(); } : undefined}
      onDrop={editMode ? onDrop : undefined}
      onDragEnd={editMode ? onDragEnd : undefined}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:   isDragOver ? T.blueBg : (hov && !editMode) ? T.gray50 : T.cardBg,
        border:       isDragOver
                        ? `2px dashed ${T.blue}`
                        : editMode
                        ? `1.5px dashed ${T.blueMid}`
                        : milestone.critical
                        ? `1px solid ${T.redBorder}`
                        : T.cardBorder,
        borderRadius: "10px",
        padding:      "12px 14px",
        cursor:       editMode ? "grab" : "default",
        transition:   "all 0.15s",
        boxShadow:    hov && !editMode ? T.cardShadow : "none",
        transform:    isDragOver ? "scale(1.02)" : "scale(1)",
        userSelect:   "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
        {editMode && (
          <div style={{ paddingTop: "3px", flexShrink: 0 }}>
            <IcoGrip />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Index + badges */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "7px", flexWrap: "wrap" }}>
            <span style={{
              fontFamily:    T.mono,
              fontSize:      "10px",
              fontWeight:    "600",
              color:         T.blue,
              background:    T.blueBg,
              border:        `1px solid ${T.blueBorder}`,
              padding:       "2px 7px",
              borderRadius:  "4px",
              letterSpacing: "0.04em",
              flexShrink:    0,
            }}>
              {String(index + 1).padStart(2, "0")}
            </span>
            {milestone.critical  && <Badge text="CRITICAL" color={T.red}    bg={T.redBg}   border={T.redBorder} />}
            {milestone.automated && <Badge text="AUTO"     color={T.gray500} bg={T.gray100} border={T.gray300}  />}
          </div>

          {/* Name */}
          <div style={{ fontSize: "12px", fontWeight: "600", color: T.gray900, lineHeight: "1.4", marginBottom: "5px" }}>
            {milestone.name}
          </div>

          {/* Variables summary */}
          <div style={{ fontSize: "11px", color: T.gray400 }}>
            Expected date
            {(milestone.vars ?? []).length > 0
              ? ` + ${(milestone.vars ?? []).length} custom variable${milestone.vars.length > 1 ? "s" : ""}`
              : ""}
          </div>
        </div>

        {/* Remove button — only shown in create mode when onRemove is passed */}
        {onRemove && (
          <button
            onClick={onRemove}
            style={{
              ...ghostBtn,
              color:        T.gray400,
              flexShrink:   0,
              marginTop:    "-2px",
              borderRadius: "5px",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.redBg; e.currentTarget.style.color = T.red; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none";  e.currentTarget.style.color = T.gray400; }}
          >
            <IcoX />
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================
//  MODAL
// =============================================================

export function Modal({ title, titleColor, onClose, children }) {
  return (
    <div style={{
      position:       "fixed",
      inset:          0,
      zIndex:         1000,
      background:     "rgba(17,24,39,0.4)",
      backdropFilter: "blur(4px)",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      animation:      "fadeIn 0.15s ease",
    }}>
      <div style={{
        background:   T.cardBg,
        border:       T.cardBorder,
        borderRadius: "16px",
        padding:      "32px",
        width:        "440px",
        maxWidth:     "92vw",
        boxShadow:    "0 20px 60px rgba(0,0,0,0.15)",
        animation:    "scaleIn 0.18s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: titleColor || T.gray900 }}>
            {title}
          </h3>
          <button onClick={onClose} style={{ ...ghostBtn, color: T.gray400 }}>
            <IcoX />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// =============================================================
//  MILESTONE FORM  (add a single milestone — used in both pages)
// =============================================================

export function MilestoneForm({ onAdd, onClose, submitLabel = "Add Milestone" }) {
  const [name,      setName]    = useState("");
  const [critical,  setCrit]    = useState(false);
  const [automated, setAuto]    = useState(false);
  const [vars,      setVars]    = useState([]);
  const [varInput,  setVarInput] = useState("");

  const handleAddVar = () => {
    if (!varInput.trim()) return;
    setVars(prev => [...prev, { id: Date.now(), label: varInput.trim() }]);
    setVarInput("");
  };

  const handleRemoveVar = (id) => setVars(prev => prev.filter(v => v.id !== id));

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({ id: `m${Date.now()}`, name: name.trim(), automated, critical, vars });
    setName(""); setCrit(false); setAuto(false); setVars([]); setVarInput("");
    if (onClose) onClose();
  };

  const onFocus = (e) => { e.target.style.borderColor = T.blue;    e.target.style.boxShadow = `0 0 0 3px ${T.blueBg}`; };
  const onBlur  = (e) => { e.target.style.borderColor = T.gray200; e.target.style.boxShadow = "none"; };

  return (
    <div>
      {/* Milestone name */}
      <div style={{ marginBottom: "14px" }}>
        <label style={lbl}>Milestone Name *</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Departure from Origin"
          style={inp}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>

      {/* Default variable — always present, locked */}
      <div style={{ marginBottom: "14px" }}>
        <label style={lbl}>Default Variable</label>
        <div style={{
          ...inp,
          color:      T.gray400,
          cursor:     "not-allowed",
          background: T.gray100,
          display:    "flex",
          alignItems: "center",
          gap:        "8px",
        }}>
          <span style={{
            fontSize:     "10px",
            background:   T.gray200,
            color:        T.gray500,
            padding:      "2px 7px",
            borderRadius: "4px",
            fontWeight:   "700",
          }}>
            DEFAULT
          </span>
          Expected Date
        </div>
      </div>

      {/* Custom variables */}
      <div style={{ marginBottom: "16px" }}>
        <label style={lbl}>Custom Variables</label>

        {vars.map(v => (
          <div key={v.id} style={{ display: "flex", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
            <div style={{ ...inp, flex: 1, color: T.gray700, background: T.cardBg, boxSizing: "border-box", fontSize: "12px" }}>
              {v.label}
            </div>
            <button
              onClick={() => handleRemoveVar(v.id)}
              style={{
                background:   T.redBg,
                border:       `1px solid ${T.redBorder}`,
                borderRadius: "7px",
                padding:      "7px 9px",
                cursor:       "pointer",
                color:        T.red,
                display:      "flex",
                flexShrink:   0,
              }}
            >
              <IcoTrash />
            </button>
          </div>
        ))}

        <div style={{ display: "flex", gap: "6px" }}>
          <input
            value={varInput}
            onChange={e => setVarInput(e.target.value)}
            placeholder="e.g. Flight Number"
            style={{ ...inp, fontSize: "12px" }}
            onKeyDown={e => e.key === "Enter" && handleAddVar()}
            onFocus={onFocus}
            onBlur={onBlur}
          />
          <button
            onClick={handleAddVar}
            style={{
              ...solidBtn(T.blue, "#fff"),
              padding:      "8px 12px",
              borderRadius: "8px",
              flexShrink:   0,
              fontSize:     "12px",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.87"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <IcoPlus /> Add
          </button>
        </div>
      </div>

      {/* Flags */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
        <ToggleCheck
          label="Critical Milestone"
          checked={critical}
          onChange={setCrit}
          color={T.red}
          bg={T.redBg}
        />
        <ToggleCheck
          label="Automated (skip alerts)"
          checked={automated}
          onChange={setAuto}
          color={T.gray500}
          bg={T.gray100}
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!name.trim()}
        style={{
          ...solidBtn(name.trim() ? T.blue : T.gray300, name.trim() ? "#fff" : T.gray500),
          width:          "100%",
          padding:        "10px",
          borderRadius:   "8px",
          cursor:         name.trim() ? "pointer" : "not-allowed",
          justifyContent: "center",
          fontSize:       "13px",
        }}
        onMouseEnter={e => { if (name.trim()) e.currentTarget.style.opacity = "0.87"; }}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
      >
        {submitLabel}
      </button>
    </div>
  );
}

// =============================================================
//  PAGE-LEVEL KEYFRAMES  (paste inside a <style> tag)
// =============================================================

export const PAGE_KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  @keyframes fadeIn    { from { opacity: 0 }                          to { opacity: 1 } }
  @keyframes scaleIn   { from { transform: scale(0.96); opacity: 0 } to { transform: scale(1); opacity: 1 } }
  @keyframes slideDown { from { transform: translateY(-8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
  @keyframes toastIn   { from { transform: translateY(-12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
  @keyframes countExit  { from { transform: translateY(0);    opacity: 1 } to { transform: translateY(-28px); opacity: 0 } }
  @keyframes countEnter { from { transform: translateY(28px); opacity: 0 } to { transform: translateY(0);     opacity: 1 } }
`;