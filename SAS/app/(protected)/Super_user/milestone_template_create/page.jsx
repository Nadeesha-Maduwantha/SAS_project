"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T, solidBtn, outlineBtn, inp, lbl } from "@/styles/tokens";
import {
  SectionHead, Modal, PAGE_KEYFRAMES,
} from "@/components/milestones/templateComponents";
import AssignTemplateModal from "@/components/milestones/AssignTemplateModal";
import MilestoneSequenceEdit from "@/components/milestones/Milestonesequenceedit";

const SHIPMENT_TYPES = [
  "Air Freight - Standard",
  "Air Freight - Express",
  "Sea Freight - FCL",
  "Sea Freight - LCL",
  "Road Freight",
  "Courier / Express",
];

export default function CreateTemplatePage() {
  const router = useRouter();

  // ── Template meta ────────────────────────────────────────────
  const [tmplName,     setTmplName]    = useState("");
  const [shipmentType, setShipType]    = useState("");
  const [description,  setDescription] = useState("");

  // ── Milestones ───────────────────────────────────────────────
  const [milestones, setMilestones] = useState([]);

  // ── UI state ─────────────────────────────────────────────────
  const [showDiscard,   setShowDiscard]   = useState(false);
  const [errors,        setErrors]        = useState({});
  const [saving,        setSaving]        = useState(false);
  const [showAssign,    setShowAssign]    = useState(false);
  const [justCreatedId, setJustCreatedId] = useState(null);

  const onFocus = (e) => { e.target.style.borderColor = T.blue;    e.target.style.boxShadow = `0 0 0 3px ${T.blueBg}`; };
  const onBlur  = (e) => { e.target.style.borderColor = errors[e.target.name] ? T.red : T.gray200; e.target.style.boxShadow = "none"; };

  // ── Validation ───────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!tmplName.trim())        e.tmplName    = "Template name is required";
    if (!shipmentType.trim())    e.shipmentType = "Shipment type is required";
    if (milestones.length === 0) e.milestones   = "Add at least one milestone";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Save ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch("http://localhost:5000/api/templates", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:          tmplName,
          shipment_type: shipmentType,
          description,
          milestones: milestones.map((m, i) => ({ name: m.name, sequence_order: i })),
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setJustCreatedId(result.data.id);
        setShowAssign(true);
      } else {
        alert(result.error || "Failed to save template");
      }
    } catch {
      alert("Could not connect to server. Is Flask running on port 5000?");
    } finally {
      setSaving(false);
    }
  };

  // ── Save as Copy (not applicable on create, but MilestoneSequenceEdit requires it) ──
  // On create page we just save normally — this won't be triggered but is required by the component
  const handleSaveAsCopy = async (name) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch("http://localhost:5000/api/templates", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          shipment_type: shipmentType,
          description,
          milestones: milestones.map((m, i) => ({ name: m.name, sequence_order: i })),
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setJustCreatedId(result.data.id);
        setShowAssign(true);
      } else {
        alert(result.error || "Failed to save template");
      }
    } catch {
      alert("Could not connect to server. Is Flask running on port 5000?");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignClose = () => {
    setShowAssign(false);
    router.push(`/Super_user/milestone_template?id=${justCreatedId}`);
  };

  const handleDiscard = () => router.push("/Super_user/milestone_templates_list");

  return (
    <>
      <style>{PAGE_KEYFRAMES}</style>

      <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: T.font, color: T.gray900, padding: "32px 32px 80px" }}>

        {/* Page title */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: T.gray900, letterSpacing: "-0.015em", marginBottom: "4px" }}>
            Create Milestone Template
          </h1>
          <p style={{ fontSize: "13px", color: T.gray500, margin: 0 }}>
            Define the milestone sequence and settings for a new shipment template.
          </p>
        </div>

        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>

          {/* ── LEFT: Milestone sequence ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ background: T.cardBg, border: T.cardBorder, borderRadius: T.cardRadius, boxShadow: T.cardShadow, padding: "24px 28px", minHeight: "400px" }}>
              <div style={{ marginBottom: "18px" }}>
                <SectionHead
                  title="Milestone Sequence"
                  pill={milestones.length > 0 ? `${milestones.length} milestone${milestones.length > 1 ? "s" : ""}` : undefined}
                />
              </div>

              {errors.milestones && (
                <div style={{ fontSize: "12px", color: T.red, background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
                  {errors.milestones}
                </div>
              )}

              {/* MilestoneSequenceEdit handles the full edit experience */}
              <MilestoneSequenceEdit
                milestones={milestones}
                onChange={setMilestones}
                onSave={handleSave}
                onSaveAsCopy={handleSaveAsCopy}
                saving={saving}
                templateName={tmplName || "New Template"}
              />
            </div>
          </div>

          {/* ── RIGHT: Template details ── */}
          <div style={{ width: "300px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "14px", position: "sticky", top: "32px" }}>

            {/* Card: Template details */}
            <div style={{ background: T.cardBg, border: T.cardBorder, borderRadius: T.cardRadius, boxShadow: T.cardShadow, padding: "22px 20px" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: T.gray900, marginBottom: "16px" }}>Template Details</div>

              {/* Template name */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ ...lbl, color: errors.tmplName ? T.red : T.gray500 }}>Template Name *</label>
                <input
                  name="tmplName" value={tmplName}
                  onChange={e => { setTmplName(e.target.value); if (errors.tmplName) setErrors(p => ({ ...p, tmplName: null })); }}
                  placeholder="e.g. Air Freight - Express"
                  style={{ ...inp, borderColor: errors.tmplName ? T.red : T.gray200 }}
                  onFocus={onFocus} onBlur={onBlur}
                />
                {errors.tmplName && <div style={{ fontSize: "11px", color: T.red, marginTop: "4px" }}>{errors.tmplName}</div>}
              </div>

              {/* Shipment type */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ ...lbl, color: errors.shipmentType ? T.red : T.gray500 }}>Shipment Type *</label>
                <select
                  name="shipmentType" value={shipmentType}
                  onChange={e => { setShipType(e.target.value); if (errors.shipmentType) setErrors(p => ({ ...p, shipmentType: null })); }}
                  style={{
                    ...inp, borderColor: errors.shipmentType ? T.red : T.gray200,
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
                    paddingRight: "32px", cursor: "pointer",
                  }}
                  onFocus={onFocus} onBlur={onBlur}
                >
                  <option value="" disabled>Select a shipment type</option>
                  {SHIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.shipmentType && <div style={{ fontSize: "11px", color: T.red, marginTop: "4px" }}>{errors.shipmentType}</div>}
              </div>

              {/* Description */}
              <div>
                <label style={lbl}>
                  Description{" "}
                  <span style={{ color: T.gray400, textTransform: "none", letterSpacing: 0, fontWeight: "500" }}>(optional)</span>
                </label>
                <textarea
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of when this template is used..."
                  rows={3}
                  style={{ ...inp, resize: "vertical", lineHeight: "1.55", minHeight: "72px" }}
                  onFocus={onFocus}
                  onBlur={e => { e.target.style.borderColor = T.gray200; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* Discard */}
            <div style={{ background: T.cardBg, border: T.cardBorder, borderRadius: T.cardRadius, boxShadow: T.cardShadow, padding: "16px 20px" }}>
              <button
                onClick={() => setShowDiscard(true)}
                style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50), width: "100%", justifyContent: "center" }}
                onMouseEnter={e => e.currentTarget.style.background = T.gray100}
                onMouseLeave={e => e.currentTarget.style.background = T.gray50}
              >
                Discard
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Discard modal */}
      {showDiscard && (
        <Modal title="Discard Template" titleColor={T.gray900} onClose={() => setShowDiscard(false)}>
          <p style={{ fontSize: "13px", color: T.gray500, marginBottom: "24px", lineHeight: "1.65" }}>
            All unsaved changes will be lost including the{" "}
            <strong style={{ color: T.gray900 }}>{milestones.length}</strong> milestone{milestones.length !== 1 ? "s" : ""} you have added.
            This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={() => setShowDiscard(false)} style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50), padding: "9px 18px" }}
              onMouseEnter={e => e.currentTarget.style.background = T.gray100} onMouseLeave={e => e.currentTarget.style.background = T.gray50}>
              Keep Editing
            </button>
            <button onClick={handleDiscard} style={{ ...solidBtn(T.red, "#fff"), padding: "9px 22px", borderRadius: "8px" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.87"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
              Discard
            </button>
          </div>
        </Modal>
      )}

      {/* Assign modal */}
      <AssignTemplateModal
        isOpen={showAssign}
        onClose={handleAssignClose}
        templateId={justCreatedId}
        templateName={tmplName}
      />
    </>
  );
}