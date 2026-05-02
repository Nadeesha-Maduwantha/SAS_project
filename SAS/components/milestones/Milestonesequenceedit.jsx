"use client";

// =============================================================
//  MilestoneSequenceEdit.jsx
//  Path: components/milestones/MilestoneSequenceEdit.jsx
//
//  Editable milestone sequence with:
//    - Drag and drop reorder
//    - Remove with confirmation
//    - Add milestone inline form
//    - Save and Save as Copy actions
//
//  Props:
//    milestones       — array of milestone objects
//    onChange         — (newMilestones) => void
//    onSave           — async () => void  — called for "Save"
//    onSaveAsCopy     — async (copyName) => void — called for "Save as Copy"
//    saving           — bool
//    templateName     — string (used to pre-fill copy name)
// =============================================================

import { useState } from "react";
import { T, solidBtn, outlineBtn, ghostBtn, inp, lbl } from "@/styles/tokens";

// ── Icons ──────────────────────────────────────────────────────────────────────
const IcoGrip  = () => <svg width="11" height="16" viewBox="0 0 12 20" fill={T.gray300}><circle cx="4" cy="4" r="1.6"/><circle cx="8" cy="4" r="1.6"/><circle cx="4" cy="10" r="1.6"/><circle cx="8" cy="10" r="1.6"/><circle cx="4" cy="16" r="1.6"/><circle cx="8" cy="16" r="1.6"/></svg>;
const IcoX     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoPlus  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoTrash = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IcoSave  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IcoCopy  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const IcoWarn  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

// ── Badge ──────────────────────────────────────────────────────────────────────
function Badge({ text, color, bg, border }) {
  return (
    <span style={{
      fontSize: "10px", fontWeight: "700", color, background: bg,
      border: `1px solid ${border}`, padding: "2px 7px", borderRadius: "4px",
      letterSpacing: "0.05em", whiteSpace: "nowrap",
    }}>
      {text}
    </span>
  );
}

// ── Toggle checkbox ────────────────────────────────────────────────────────────
function ToggleCheck({ label, checked, onChange, color, bg }) {
  return (
    <div onClick={() => onChange(!checked)}
      style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" }}
    >
      <div style={{
        width: "16px", height: "16px", borderRadius: "4px",
        border: `1.5px solid ${checked ? color : T.gray300}`,
        background: checked ? bg : T.cardBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s", flexShrink: 0,
      }}>
        {checked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <span style={{ fontSize: "12px", color: checked ? color : T.gray700 }}>{label}</span>
    </div>
  );
}

// ── Remove confirmation modal ──────────────────────────────────────────────────
function RemoveConfirmModal({ milestone, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1100,
      background: "rgba(17,24,39,0.45)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: T.cardBg, border: T.cardBorder, borderRadius: "14px",
        padding: "28px", width: "380px", maxWidth: "92vw",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      }}>
        {/* Warning icon + title */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <div style={{ color: T.red }}><IcoWarn /></div>
          <span style={{ fontSize: "15px", fontWeight: "700", color: T.gray900 }}>Remove Milestone</span>
        </div>

        <p style={{ fontSize: "13px", color: T.gray500, lineHeight: "1.65", marginBottom: "10px" }}>
          Are you sure you want to remove{" "}
          <strong style={{ color: T.gray900 }}>{milestone.name}</strong> from this sequence?
        </p>

        {milestone.is_critical && (
          <div style={{
            background: T.redBg, border: `1px solid ${T.redBorder}`,
            borderRadius: "8px", padding: "10px 14px", marginBottom: "10px",
            fontSize: "12px", color: T.red, lineHeight: "1.5",
          }}>
            This is a <strong>critical milestone</strong> — removing it may affect alert generation.
          </div>
        )}

        <p style={{ fontSize: "12px", color: T.gray400, marginBottom: "22px" }}>
          You can always add it back using the Add Milestone form below.
        </p>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50), padding: "8px 18px" }}
            onMouseEnter={e => e.currentTarget.style.background = T.gray100}
            onMouseLeave={e => e.currentTarget.style.background = T.gray50}
          >
            Keep It
          </button>
          <button
            onClick={onConfirm}
            style={{ ...solidBtn(T.red, "#fff"), padding: "8px 20px", borderRadius: "8px" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.87"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <IcoTrash /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Save as Copy modal ─────────────────────────────────────────────────────────
function SaveAsCopyModal({ defaultName, onConfirm, onCancel, saving }) {
  const [copyName, setCopyName] = useState(defaultName);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1100,
      background: "rgba(17,24,39,0.45)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: T.cardBg, border: T.cardBorder, borderRadius: "14px",
        padding: "28px", width: "400px", maxWidth: "92vw",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      }}>
        <div style={{ fontSize: "15px", fontWeight: "700", color: T.gray900, marginBottom: "6px" }}>
          Save as New Copy
        </div>
        <p style={{ fontSize: "13px", color: T.gray500, lineHeight: "1.65", marginBottom: "18px" }}>
          A new template will be created with your current changes. The original remains unchanged.
        </p>

        <div style={{ marginBottom: "20px" }}>
          <label style={lbl}>New Template Name</label>
          <input
            value={copyName}
            onChange={e => setCopyName(e.target.value)}
            style={inp}
            onFocus={e => { e.target.style.borderColor = T.blue; e.target.style.boxShadow = `0 0 0 3px ${T.blueBg}`; }}
            onBlur={e =>  { e.target.style.borderColor = T.gray200; e.target.style.boxShadow = "none"; }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50), padding: "8px 18px" }}
            onMouseEnter={e => e.currentTarget.style.background = T.gray100}
            onMouseLeave={e => e.currentTarget.style.background = T.gray50}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(copyName)}
            disabled={!copyName.trim() || saving}
            style={{
              ...solidBtn(copyName.trim() ? T.blue : T.gray300, "#fff"),
              padding: "8px 22px", borderRadius: "8px",
              cursor: copyName.trim() && !saving ? "pointer" : "not-allowed",
              opacity: saving ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (copyName.trim() && !saving) e.currentTarget.style.opacity = "0.87"; }}
            onMouseLeave={e => e.currentTarget.style.opacity = saving ? "0.7" : "1"}
          >
            {saving ? "Saving..." : <><IcoCopy /> Save Copy</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add milestone inline form ──────────────────────────────────────────────────
function AddMilestoneForm({ onAdd, onClose }) {
  const [name,      setName]     = useState("");
  const [critical,  setCritical] = useState(false);
  const [automated, setAuto]     = useState(false);
  const [vars,      setVars]     = useState([]);
  const [varInput,  setVarInput] = useState("");

  const addVar    = () => { if (!varInput.trim()) return; setVars(p => [...p, { id: Date.now(), label: varInput.trim() }]); setVarInput(""); };
  const removeVar = (id) => setVars(p => p.filter(v => v.id !== id));

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({ id: `m${Date.now()}`, name: name.trim(), is_critical: critical, automated, vars });
    onClose();
  };

  return (
    <div style={{
      background: T.blueBg, border: `1px solid ${T.blueBorder}`,
      borderRadius: "10px", padding: "16px", animation: "slideDown 0.18s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <span style={{ fontSize: "13px", fontWeight: "700", color: T.blue }}>New Milestone</span>
        <button onClick={onClose} style={{ ...ghostBtn, color: T.gray400 }}><IcoX /></button>
      </div>

      {/* Name */}
      <div style={{ marginBottom: "12px" }}>
        <label style={lbl}>Milestone Name *</label>
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Departure from Origin"
          style={inp}
          onFocus={e => { e.target.style.borderColor = T.blue; e.target.style.boxShadow = `0 0 0 3px ${T.blueBg}`; }}
          onBlur={e =>  { e.target.style.borderColor = T.gray200; e.target.style.boxShadow = "none"; }}
        />
      </div>

      {/* Custom variables */}
      <div style={{ marginBottom: "12px" }}>
        <label style={lbl}>Custom Variables</label>
        {vars.map(v => (
          <div key={v.id} style={{ display: "flex", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
            <div style={{ ...inp, flex: 1, color: T.gray700, fontSize: "12px" }}>{v.label}</div>
            <button onClick={() => removeVar(v.id)} style={{ background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: "7px", padding: "7px 9px", cursor: "pointer", color: T.red, display: "flex" }}>
              <IcoTrash />
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: "6px" }}>
          <input
            value={varInput} onChange={e => setVarInput(e.target.value)}
            placeholder="e.g. Flight Number"
            style={{ ...inp, fontSize: "12px" }}
            onKeyDown={e => e.key === "Enter" && addVar()}
            onFocus={e => { e.target.style.borderColor = T.blue; e.target.style.boxShadow = `0 0 0 3px ${T.blueBg}`; }}
            onBlur={e =>  { e.target.style.borderColor = T.gray200; e.target.style.boxShadow = "none"; }}
          />
          <button onClick={addVar} style={{ ...solidBtn(T.blue, "#fff"), padding: "8px 12px", borderRadius: "8px", flexShrink: 0, fontSize: "12px" }}>
            <IcoPlus /> Add
          </button>
        </div>
      </div>

      {/* Flags */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
        <ToggleCheck label="Critical Milestone"   checked={critical}  onChange={setCritical} color={T.red}    bg={T.redBg}   />
        <ToggleCheck label="Automated (skip alerts)" checked={automated} onChange={setAuto}    color={T.gray500} bg={T.gray100} />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!name.trim()}
        style={{
          ...solidBtn(name.trim() ? T.blue : T.gray300, name.trim() ? "#fff" : T.gray500),
          width: "100%", padding: "9px", borderRadius: "8px",
          justifyContent: "center", fontSize: "13px",
          cursor: name.trim() ? "pointer" : "not-allowed",
        }}
        onMouseEnter={e => { if (name.trim()) e.currentTarget.style.opacity = "0.87"; }}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
      >
        Add to Sequence
      </button>
    </div>
  );
}

// ── Editable milestone card ────────────────────────────────────────────────────
function MilestoneEditCard({ milestone, index, onRemove, onDragStart, onDragOver, onDrop, onDragEnd, isDragOver }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:   isDragOver ? T.blueBg : T.cardBg,
        border:       isDragOver ? `2px dashed ${T.blue}` : `1.5px dashed ${T.blueMid}`,
        borderRadius: "10px", padding: "12px 14px",
        cursor:       "grab", transition: "all 0.15s",
        transform:    isDragOver ? "scale(1.02)" : "scale(1)",
        userSelect:   "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
        {/* Grip */}
        <div style={{ paddingTop: "3px", flexShrink: 0 }}><IcoGrip /></div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Index + badges */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "7px", flexWrap: "wrap" }}>
            <span style={{
              fontFamily: T.mono, fontSize: "10px", fontWeight: "600",
              color: T.blue, background: T.blueBg,
              border: `1px solid ${T.blueBorder}`,
              padding: "2px 7px", borderRadius: "4px", flexShrink: 0,
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
          <div style={{ fontSize: "11px", color: T.gray400 }}>Expected date</div>
        </div>

        {/* Remove button */}
        <button
          onClick={onRemove}
          style={{
            ...ghostBtn, color: T.gray400, flexShrink: 0,
            marginTop: "-2px", borderRadius: "5px",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = T.redBg; e.currentTarget.style.color = T.red; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none";  e.currentTarget.style.color = T.gray400; }}
        >
          <IcoX />
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MilestoneSequenceEdit({
  milestones    = [],
  onChange,
  onSave,
  onSaveAsCopy,
  saving        = false,
  templateName  = "Template",
}) {
  const [dragIdx,        setDragIdx]        = useState(null);
  const [dragOver,       setDragOver]       = useState(null);
  const [showAddForm,    setShowAddForm]     = useState(false);
  const [removeTarget,   setRemoveTarget]   = useState(null); // milestone to confirm remove
  const [showCopyModal,  setShowCopyModal]  = useState(false);

  // ── Drag handlers ──────────────────────────────────────────
  const handleDragStart = (i) => setDragIdx(i);
  const handleDragOver  = (i) => setDragOver(i);
  const handleDragEnd   = ()  => { setDragIdx(null); setDragOver(null); };
  const handleDrop      = (i) => {
    if (dragIdx === null || dragIdx === i) return;
    const arr = [...milestones];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(i, 0, moved);
    onChange(arr);
    setDragIdx(null);
    setDragOver(null);
  };

  // ── Milestone actions ──────────────────────────────────────
  const handleAdd    = (m)  => onChange([...milestones, m]);
  const handleRemove = (m)  => setRemoveTarget(m);
  const confirmRemove = ()  => {
    onChange(milestones.filter(m => m.id !== removeTarget.id));
    setRemoveTarget(null);
  };

  return (
    <>
      <style>{`
        @keyframes slideDown { from{transform:translateY(-8px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>

      {/* Drag hint */}
      {milestones.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <span style={{
            fontSize: "12px", color: T.blue, background: T.blueBg,
            border: `1px solid ${T.blueBorder}`,
            padding: "4px 12px", borderRadius: "20px", fontWeight: "500",
          }}>
            Drag cards to reorder · click × to remove
          </span>
        </div>
      )}

      {/* Milestone grid */}
      {milestones.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "40px 20px",
          border: `1.5px dashed ${T.gray200}`, borderRadius: "10px", textAlign: "center",
          marginBottom: "14px",
        }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: T.gray500, marginBottom: "4px" }}>
            No milestones yet
          </div>
          <div style={{ fontSize: "12px", color: T.gray400 }}>Use the form below to add milestones.</div>
        </div>
      ) : (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px",
          padding: "14px", border: `1.5px dashed ${T.blueMid}`,
          borderRadius: "10px", background: "#F0F7FF", marginBottom: "14px",
        }}>
          {milestones.map((m, i) => (
            <MilestoneEditCard
              key={m.id ?? i}
              milestone={m}
              index={i}
              onRemove={() => handleRemove(m)}
              onDragStart={() => handleDragStart(i)}
              onDragOver={() => handleDragOver(i)}
              onDrop={() => handleDrop(i)}
              onDragEnd={handleDragEnd}
              isDragOver={dragOver === i && dragIdx !== i}
            />
          ))}
        </div>
      )}

      {/* Add milestone toggle */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
            width: "100%", padding: "10px",
            background: T.blueBg, border: `1.5px dashed ${T.blueMid}`,
            borderRadius: "9px", color: T.blue, fontWeight: "600",
            fontSize: "13px", cursor: "pointer", fontFamily: T.font,
            marginBottom: "16px",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#DBEAFE"}
          onMouseLeave={e => e.currentTarget.style.background = T.blueBg}
        >
          <IcoPlus /> Add Milestone
        </button>
      ) : (
        <div style={{ marginBottom: "16px" }}>
          <AddMilestoneForm onAdd={handleAdd} onClose={() => setShowAddForm(false)} />
        </div>
      )}

      {/* Count summary */}
      {milestones.length > 0 && (
        <div style={{ fontSize: "12px", color: T.gray500, marginBottom: "14px" }}>
          <strong style={{ color: T.gray900 }}>{milestones.length}</strong> milestone{milestones.length > 1 ? "s" : ""} in sequence.
        </div>
      )}

      {/* Save actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            ...solidBtn(T.blue, "#fff"),
            width: "100%", padding: "10px", borderRadius: "9px",
            justifyContent: "center", fontSize: "13px",
            opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer",
          }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.opacity = "0.87"; }}
          onMouseLeave={e => e.currentTarget.style.opacity = saving ? "0.7" : "1"}
        >
          <IcoSave /> {saving ? "Saving..." : "Save"}
        </button>

        <button
          onClick={() => setShowCopyModal(true)}
          disabled={saving}
          style={{
            ...outlineBtn(T.blue, T.blueBorder, T.blueBg),
            width: "100%", justifyContent: "center",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#DBEAFE"}
          onMouseLeave={e => e.currentTarget.style.background = T.blueBg}
        >
          <IcoCopy /> Save as Copy
        </button>
      </div>

      {/* Remove confirmation modal */}
      {removeTarget && (
        <RemoveConfirmModal
          milestone={removeTarget}
          onConfirm={confirmRemove}
          onCancel={() => setRemoveTarget(null)}
        />
      )}

      {/* Save as Copy modal */}
      {showCopyModal && (
        <SaveAsCopyModal
          defaultName={`${templateName} (Copy)`}
          saving={saving}
          onConfirm={async (name) => {
            await onSaveAsCopy(name);
            setShowCopyModal(false);
          }}
          onCancel={() => setShowCopyModal(false)}
        />
      )}
    </>
  );
}