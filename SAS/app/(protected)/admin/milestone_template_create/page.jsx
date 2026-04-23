"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T, solidBtn, outlineBtn, inp, lbl } from "@/styles/tokens";
import {
  SectionHead,
  MilestoneCard, MilestoneForm, Modal,
  PAGE_KEYFRAMES,
} from "@/app/(protected)/admin/milestone_templates_list/components/templateComponents";
// =============================================================
//  File path: app/(protected)/admin/milestone_template_create/page.jsx
//  Route:     /admin/milestone_template_create
// =============================================================

// Shipment type options for the dropdown
const SHIPMENT_TYPES = [
  "Air Freight - Standard",
  "Air Freight - Express",
  "Sea Freight - FCL",
  "Sea Freight - LCL",
  "Road Freight",
  "Courier / Express",
];

// =============================================================
//  PAGE
// =============================================================

export default function CreateTemplatePage() {
  const router = useRouter();

  // --- Template meta fields -----------------------------------
  const [tmplName,     setTmplName]    = useState("");
  const [shipmentType, setShipType]    = useState("");
  const [description,  setDescription] = useState("");

  // --- Milestones ---------------------------------------------
  const [milestones,   setMilestones]  = useState([]);
  const [dragIdx,      setDragIdx]     = useState(null);
  const [dragOver,     setDragOver]    = useState(null);

  // --- UI state -----------------------------------------------
  const [showDiscard,  setShowDiscard] = useState(false);
  const [errors,       setErrors]      = useState({});   // field-level validation

  // --- Focus handlers -----------------------------------------
  const onFocus = (e) => { e.target.style.borderColor = T.blue;    e.target.style.boxShadow = `0 0 0 3px ${T.blueBg}`; };
  const onBlur  = (e) => { e.target.style.borderColor = errors[e.target.name] ? T.red : T.gray200; e.target.style.boxShadow = "none"; };

  // --- Drag and drop ------------------------------------------
  const onDragStart = (i) => setDragIdx(i);
  const onDragOver  = (i) => setDragOver(i);
  const onDrop      = (i) => {
    if (dragIdx === null || dragIdx === i) return;
    const arr = [...milestones];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(i, 0, moved);
    setMilestones(arr);
    setDragIdx(null);
    setDragOver(null);
  };
  const onDragEnd   = ()  => { setDragIdx(null); setDragOver(null); };

  // --- Milestone actions -------------------------------------
  const addMilestone    = (m)  => setMilestones(prev => [...prev, m]);
  const removeMilestone = (id) => setMilestones(prev => prev.filter(m => m.id !== id));

  // --- Validation --------------------------------------------
  const validate = () => {
    const e = {};
    if (!tmplName.trim())     e.tmplName    = "Template name is required";
    if (!shipmentType.trim()) e.shipmentType = "Shipment type is required";
    if (milestones.length === 0) e.milestones = "Add at least one milestone";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // --- Save --------------------------------------------------
  const [saving, setSaving] = useState(false);

  // Replace the entire handleSave function with this:
  const handleSave = async () => {
    // validate() checks name, shipmentType, milestones are filled
    // returns false if anything missing — stops here
    if (!validate()) return;

    setSaving(true); // disable the button while request is in flight

    try {
      const response = await fetch('http://localhost:5000/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          tmplName,
          shipment_type: shipmentType,
          description:   description,
          milestones:    milestones.map((m, i) => ({
            name:           m.name,
            sequence_order: i,
          }))
        })
      });

      const result = await response.json();

      if (response.ok) {
        // result.data.id is the real UUID from Supabase
        // this replaces the fake TPL-${Date.now()} id
        router.push(`/admin/milestone_template?id=${result.data.id}`);
      } else {
        alert(result.error || 'Failed to save template');
      }

    } catch {
      // this runs if Flask is not running at all
      alert('Could not connect to server. Is Flask running on port 5000?');
    } finally {
      setSaving(false); // re-enable button whether success or error
    }
  };

  const handleDiscard = () => {
    router.push("/admin/milestone_templates_list");
  };

  // --- Computed -----------------------------------------------
  const hasMilestones = milestones.length > 0;

  return (
    <>
      <style>{PAGE_KEYFRAMES}</style>

      <div style={{
        minHeight:  "100vh",
        background: T.pageBg,
        fontFamily: T.font,
        color:      T.gray900,
        padding:    "32px 32px 80px",
      }}>

        {/* ── Page title ──────────────────────────────────────────── */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: T.gray900, letterSpacing: "-0.015em", marginBottom: "4px" }}>
            Create Milestone Template
          </h1>
          <p style={{ fontSize: "13px", color: T.gray500, margin: 0 }}>
            Define the milestone sequence and settings for a new shipment template.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════
            TWO-COLUMN LAYOUT
            Left  — milestone preview list
            Right — form inputs and add milestone section
        ══════════════════════════════════════════════════════════ */}
        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>

          {/* ════════════ LEFT COLUMN ════════════ */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              background:   T.cardBg,
              border:       T.cardBorder,
              borderRadius: T.cardRadius,
              boxShadow:    T.cardShadow,
              padding:      "24px 28px",
              minHeight:    "400px",
            }}>
              <div style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "space-between",
                flexWrap:       "wrap",
                gap:            "10px",
                marginBottom:   "18px",
              }}>
                <SectionHead
                  title="Milestone Sequence"
                  pill={hasMilestones ? `${milestones.length} milestone${milestones.length > 1 ? "s" : ""}` : undefined}
                />
                {hasMilestones && (
                  <span style={{
                    fontSize:     "12px",
                    color:        T.blue,
                    background:   T.blueBg,
                    border:       `1px solid ${T.blueBorder}`,
                    padding:      "4px 12px",
                    borderRadius: "20px",
                    fontWeight:   "500",
                  }}>
                    Drag cards to reorder
                  </span>
                )}
              </div>

              {/* Error: no milestones */}
              {errors.milestones && (
                <div style={{
                  fontSize:     "12px",
                  color:        T.red,
                  background:   T.redBg,
                  border:       `1px solid ${T.redBorder}`,
                  borderRadius: "8px",
                  padding:      "10px 14px",
                  marginBottom: "16px",
                }}>
                  {errors.milestones}
                </div>
              )}

              {/* Empty state */}
              {!hasMilestones ? (
                <div style={{
                  display:        "flex",
                  flexDirection:  "column",
                  alignItems:     "center",
                  justifyContent: "center",
                  padding:        "60px 20px",
                  border:         `1.5px dashed ${T.gray200}`,
                  borderRadius:   "10px",
                  textAlign:      "center",
                }}>
                  <div style={{
                    width:          "44px",
                    height:         "44px",
                    borderRadius:   "10px",
                    background:     T.gray100,
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    marginBottom:   "14px",
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.gray400} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: T.gray500, marginBottom: "6px" }}>
                    No milestones added yet
                  </div>
                  <div style={{ fontSize: "12px", color: T.gray400, maxWidth: "240px", lineHeight: "1.6" }}>
                    Use the form on the right to add milestones. They will appear here in sequence.
                  </div>
                </div>
              ) : (
                /* Milestone grid — 3 columns */
                <div style={{
                  display:             "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap:                 "10px",
                  padding:             "14px",
                  border:              `1.5px dashed ${T.blueMid}`,
                  borderRadius:        "10px",
                  background:          "#F0F7FF",
                }}>
                  {milestones.map((m, i) => (
                    <MilestoneCard
                      key={m.id}
                      milestone={m}
                      index={i}
                      editMode={true}
                      onDragStart={() => onDragStart(i)}
                      onDragOver={() => onDragOver(i)}
                      onDrop={() => onDrop(i)}
                      onDragEnd={onDragEnd}
                      isDragOver={dragOver === i && dragIdx !== i}
                      onRemove={() => removeMilestone(m.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* ════════════ END LEFT COLUMN ════════════ */}

          {/* ════════════ RIGHT SIDEBAR ════════════ */}
          <div style={{
            width:         "300px",
            flexShrink:    0,
            display:       "flex",
            flexDirection: "column",
            gap:           "14px",
            position:      "sticky",
            top:           "32px",
          }}>

            {/* ── Card 1: Template details ─────────── */}
            <div style={{
              background:   T.cardBg,
              border:       T.cardBorder,
              borderRadius: T.cardRadius,
              boxShadow:    T.cardShadow,
              padding:      "22px 20px",
            }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: T.gray900, marginBottom: "16px" }}>
                Template Details
              </div>

              {/* Template name */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ ...lbl, color: errors.tmplName ? T.red : T.gray500 }}>
                  Template Name *
                </label>
                <input
                  name="tmplName"
                  value={tmplName}
                  onChange={e => { setTmplName(e.target.value); if (errors.tmplName) setErrors(p => ({ ...p, tmplName: null })); }}
                  placeholder="e.g. Air Freight - Express"
                  style={{
                    ...inp,
                    borderColor: errors.tmplName ? T.red : T.gray200,
                  }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                {errors.tmplName && (
                  <div style={{ fontSize: "11px", color: T.red, marginTop: "4px" }}>{errors.tmplName}</div>
                )}
              </div>

              {/* Shipment type */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ ...lbl, color: errors.shipmentType ? T.red : T.gray500 }}>
                  Shipment Type *
                </label>
                <select
                  name="shipmentType"
                  value={shipmentType}
                  onChange={e => { setShipType(e.target.value); if (errors.shipmentType) setErrors(p => ({ ...p, shipmentType: null })); }}
                  style={{
                    ...inp,
                    borderColor:  errors.shipmentType ? T.red : T.gray200,
                    appearance:   "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                    backgroundRepeat:   "no-repeat",
                    backgroundPosition: "right 12px center",
                    paddingRight:       "32px",
                    cursor:             "pointer",
                  }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                >
                  <option value="" disabled>Select a shipment type</option>
                  {SHIPMENT_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {errors.shipmentType && (
                  <div style={{ fontSize: "11px", color: T.red, marginTop: "4px" }}>{errors.shipmentType}</div>
                )}
              </div>

              {/* Description — optional */}
              <div>
                <label style={lbl}>Description <span style={{ color: T.gray400, textTransform: "none", letterSpacing: 0, fontWeight: "500" }}>(optional)</span></label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of when this template is used..."
                  rows={3}
                  style={{
                    ...inp,
                    resize:     "vertical",
                    lineHeight: "1.55",
                    minHeight:  "72px",
                  }}
                  onFocus={onFocus}
                  onBlur={(e) => { e.target.style.borderColor = T.gray200; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* ── Card 2: Add milestone form ───────── */}
            <div style={{
              background:   T.cardBg,
              border:       T.cardBorder,
              borderRadius: T.cardRadius,
              boxShadow:    T.cardShadow,
              padding:      "22px 20px",
            }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: T.gray900, marginBottom: "4px" }}>
                Add Milestone
              </div>
              <div style={{ fontSize: "12px", color: T.gray500, marginBottom: "16px", lineHeight: "1.5" }}>
                Each milestone added will appear in the sequence on the left.
              </div>

              <MilestoneForm
                onAdd={addMilestone}
                submitLabel="Add to Sequence"
              />
            </div>

            {/* ── Card 3: Save / Discard actions ──── */}
            <div style={{
              background:   T.cardBg,
              border:       T.cardBorder,
              borderRadius: T.cardRadius,
              boxShadow:    T.cardShadow,
              padding:      "20px",
            }}>
              {/* Milestone count summary */}
              {hasMilestones && (
                <div style={{
                  fontSize:     "12px",
                  color:        T.gray500,
                  marginBottom: "14px",
                  lineHeight:   "1.5",
                }}>
                  <strong style={{ color: T.gray900 }}>{milestones.length}</strong> milestone{milestones.length > 1 ? "s" : ""} in sequence.
                  Drag cards on the left to reorder them before saving.
                </div>
              )}

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  ...solidBtn(T.blue, "#fff"),
                  width:          "100%",
                  padding:        "11px",
                  borderRadius:   "9px",
                  justifyContent: "center",
                  fontSize:       "13px",
                  marginBottom:   "8px",
                  opacity:        saving ? 0.7 : 1,
                  cursor:         saving ? "not-allowed" : "pointer",
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.opacity = "0.87"; }}
                onMouseLeave={e => e.currentTarget.style.opacity = saving ? "0.7" : "1"}
              >
                {saving ? "Saving..." : "Save Template"}
              </button>

              {/* Discard button */}
              <button
                onClick={() => setShowDiscard(true)}
                style={{
                  ...outlineBtn(T.gray500, T.gray200, T.gray50),
                  width:          "100%",
                  justifyContent: "center",
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.gray100}
                onMouseLeave={e => e.currentTarget.style.background = T.gray50}
              >
                Discard
              </button>
            </div>

          </div>
          {/* ════════════ END RIGHT SIDEBAR ════════════ */}

        </div>
      </div>

      {/* ══ MODAL: Discard confirmation ═══════════════════════════ */}
      {showDiscard && (
        <Modal title="Discard Template" titleColor={T.gray900} onClose={() => setShowDiscard(false)}>
          <p style={{ fontSize: "13px", color: T.gray500, marginBottom: "24px", lineHeight: "1.65" }}>
            All unsaved changes will be lost including the{" "}
            <strong style={{ color: T.gray900 }}>{milestones.length}</strong> milestone{milestones.length !== 1 ? "s" : ""} you have added.
            This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowDiscard(false)}
              style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50), padding: "9px 18px" }}
              onMouseEnter={e => e.currentTarget.style.background = T.gray100}
              onMouseLeave={e => e.currentTarget.style.background = T.gray50}
            >
              Keep Editing
            </button>
            <button
              onClick={handleDiscard}
              style={{ ...solidBtn(T.red, "#fff"), padding: "9px 22px", borderRadius: "8px" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.87"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Discard
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
