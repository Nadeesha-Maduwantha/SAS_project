"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T, solidBtn, outlineBtn, ghostBtn, inp, lbl } from "@/styles/tokens";
import {
  IcoEdit, IcoPlus, IcoTrash, IcoCopy, IcoX, IcoGrip, IcoWarn,
  IcoTruck, IcoCheckList, IcoBranch,
  Badge, SectionHead, Divider, ToggleCheck,
  MilestoneCard, MilestoneForm, Modal,
  PAGE_KEYFRAMES,
} from "@/app/(protected)/admin/milestone_templates_list/components/templateComponents";
// =============================================================
//  File path: app/(protected)/Super_user/milestone_template/page.jsx
//  Route:     /templates/[id]   e.g. /templates/TPL-001
// =============================================================

// --- Dummy data (replace with API call / props) ---------------
const INITIAL_TEMPLATE = {
  id: "TPL-001",
  name: "Air Freight - Express High Value",
  shipmentsUsing: 14,
  derivedTemplates: 3,
  milestones: [
    { id: "m1", name: "Booking Confirmation",    automated: true,  critical: false, vars: [] },
    { id: "m2", name: "Cargo Ready Date",         automated: false, critical: false, vars: [] },
    { id: "m3", name: "Pickup from Shipper",      automated: false, critical: false, vars: [] },
    { id: "m4", name: "Export Customs Clearance", automated: false, critical: false, vars: [] },
    { id: "m5", name: "Departure from Origin",    automated: false, critical: true,  vars: [] },
    { id: "m6", name: "In Transit / En Route",    automated: true,  critical: false, vars: [] },
    { id: "m7", name: "Arrival at Destination",   automated: false, critical: true,  vars: [] },
    { id: "m8", name: "Import Customs Clearance", automated: false, critical: false, vars: [] },
    { id: "m9", name: "Delivery to Consignee",    automated: false, critical: false, vars: [] },
  ],
};

// =============================================================
//  STAT CARD  (with optional scroll-up number animation)
// =============================================================

function StatCard({ icon, label, value, prevValue, animating, clickable, onClick }) {
  const [hov, setHov] = useState(false);

  // When animating = true, we show the old number exiting upward
  // and the new number entering from below — slot-machine style.
  const showAnim = animating && prevValue !== undefined && prevValue !== value;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex:         1,
        minWidth:     "160px",
        background:   T.cardBg,
        border:       T.cardBorder,
        borderRadius: "12px",
        boxShadow:    hov && clickable ? T.cardShadowHover : T.cardShadow,
        padding:      "16px 18px",
        display:      "flex",
        alignItems:   "center",
        gap:          "12px",
        cursor:       clickable ? "pointer" : "default",
        transition:   "box-shadow 0.18s, transform 0.18s",
        transform:    hov && clickable ? "translateY(-2px)" : "none",
      }}
    >
      <div style={{
        width:          "38px",
        height:         "38px",
        borderRadius:   "9px",
        background:     T.blueBg,
        border:         `1px solid ${T.blueBorder}`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "11px", color: T.gray500, fontWeight: "500", letterSpacing: "0.03em", marginBottom: "3px" }}>
          {label}
        </div>
        {/* Number display — clip overflow so only one number shows at a time */}
        <div style={{ overflow: "hidden", height: "28px", position: "relative" }}>
          {showAnim ? (
            <>
              {/* Old number — exits upward */}
              <div style={{
                fontSize:   "20px",
                fontWeight: "700",
                color:      T.gray900,
                lineHeight: "28px",
                position:   "absolute",
                width:      "100%",
                animation:  "countExit 0.35s ease forwards",
              }}>
                {prevValue}
              </div>
              {/* New number — enters from below */}
              <div style={{
                fontSize:   "20px",
                fontWeight: "700",
                color:      T.blue,
                lineHeight: "28px",
                position:   "absolute",
                width:      "100%",
                animation:  "countEnter 0.35s ease forwards",
              }}>
                {value}
              </div>
            </>
          ) : (
            <div style={{ fontSize: "20px", fontWeight: "700", color: T.gray900, lineHeight: "28px" }}>
              {value}
            </div>
          )}
        </div>
      </div>
      {clickable && (
        <span style={{ fontSize: "11px", color: T.blue, fontWeight: "600", flexShrink: 0 }}>
          View
        </span>
      )}
    </div>
  );
}

// =============================================================
//  PAGE
// =============================================================

export default function MilestoneTemplatePage() {
  const router = useRouter();

  const [tmpl,       setTmpl]      = useState(INITIAL_TEMPLATE);
  const [editMode,   setEditMode]  = useState(false);
  const [showAdd,    setShowAdd]   = useState(false);
  const [showCopy,   setShowCopy]  = useState(false);
  const [showDelete, setShowDelete]= useState(false);
  const [copyName,   setCopyName]  = useState("");
  const [toast,      setToast]     = useState(null);
  const [dragIdx,      setDragIdx]      = useState(null);
  const [dragOver,     setDragOver]     = useState(null);
  const [newCopyId,    setNewCopyId]    = useState(null);   // ID of most recently saved copy
  const [countAnim,    setCountAnim]    = useState(false);  // triggers the number scroll animation
  const [prevDerived,  setPrevDerived]  = useState(null);   // value before increment

  // --- Toast --------------------------------------------------
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // --- Drag and drop ------------------------------------------
  const onDragStart = (i) => setDragIdx(i);
  const onDragOver  = (i) => setDragOver(i);
  const onDrop      = (i) => {
    if (dragIdx === null || dragIdx === i) return;
    const arr = [...tmpl.milestones];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(i, 0, moved);
    setTmpl(t => ({ ...t, milestones: arr }));
    setDragIdx(null);
    setDragOver(null);
  };
  const onDragEnd = () => { setDragIdx(null); setDragOver(null); };

  // --- Actions ------------------------------------------------
  const addMilestone = (m) => setTmpl(t => ({ ...t, milestones: [...t.milestones, m] }));

  const exitEditMode = () => { setEditMode(false); setShowAdd(false); };

  const handleSaveCopy = () => {
    if (!copyName.trim()) return;

    // Generate a new ID for the copy.
    // Replace with your actual API call once the backend is ready:
    //   const { id: newId } = await api.createTemplateCopy({ ...tmpl, name: copyName });
    const newId = `TPL-${Date.now()}`;

    // 1. Close modal and exit edit mode.
    setShowCopy(false);
    setCopyName("");
    exitEditMode();

    // 2. Store the new copy's ID so the "View new copy" banner can link to it.
    setNewCopyId(newId);

    // 3. Increment derived templates count on the original and animate the number.
    setPrevDerived(tmpl.derivedTemplates);
    setTmpl(t => ({ ...t, derivedTemplates: t.derivedTemplates + 1 }));
    setCountAnim(true);
    setTimeout(() => setCountAnim(false), 600);

    // 4. The original template's milestones are NOT changed here.
    //    Any milestones added during edit mode exist only in the copy (newId).
    //    When the user navigates to /templates/${newId}, the backend returns
    //    the copy which includes those milestones.
    //    On this page, reset milestones back to the last saved state so the
    //    original template is not polluted with the new additions.
    setTmpl(t => ({ ...t, milestones: INITIAL_TEMPLATE.milestones }));
  };

  const handleDelete = () => {
    // TODO: call API to mark template for deletion
    setShowDelete(false);
    showToast("Template scheduled for deletion once active shipments close", "warning");
  };

  const onFocus = (e) => { e.target.style.borderColor = T.blue;    e.target.style.boxShadow = `0 0 0 3px ${T.blueBg}`; };
  const onBlur  = (e) => { e.target.style.borderColor = T.gray200; e.target.style.boxShadow = "none"; };

  return (
    <>
      {/* ── Keyframe animations ─────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

        @keyframes fadeIn    { from { opacity: 0 }                          to { opacity: 1 } }
        @keyframes scaleIn   { from { transform: scale(0.96); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes slideDown { from { transform: translateY(-8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes toastIn    { from { transform: translateY(-12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes countExit  { from { transform: translateY(0);     opacity: 1 } to { transform: translateY(-28px); opacity: 0 } }
        @keyframes countEnter { from { transform: translateY(28px);  opacity: 0 } to { transform: translateY(0);     opacity: 1 } }
      `}</style>

      <div style={{
        minHeight:  "100vh",
        background: T.pageBg,
        fontFamily: T.font,
        color:      T.gray900,
        padding:    "32px 32px 80px",
      }}>

        {/* ── Toast ───────────────────────────────────────────────── */}
        {toast && (
          <div style={{
            position:     "fixed",
            top:          "24px",
            right:        "24px",
            zIndex:       2000,
            background:   toast.type === "warning" ? T.amberBg  : T.greenBg,
            border:       `1px solid ${toast.type === "warning" ? T.amberBorder : T.greenBorder}`,
            color:        toast.type === "warning" ? T.amber     : T.green,
            borderRadius: "10px",
            padding:      "12px 20px",
            fontSize:     "13px",
            fontWeight:   "600",
            boxShadow:    T.cardShadow,
            animation:    "toastIn 0.2s ease",
          }}>
            {toast.msg}
          </div>
        )}

        {/* ── Breadcrumb ──────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "22px" }}>
          <span
            onClick={() => router.push("/Super_user/milestone_templates_list")}
            style={{ fontSize: "13px", color: T.blue, fontWeight: "500", cursor: "pointer" }}
            onMouseEnter={e => e.target.style.textDecoration = "underline"}
            onMouseLeave={e => e.target.style.textDecoration = "none"}
          >
            Templates
          </span>
          <span style={{ color: T.gray300, fontSize: "14px" }}>›</span>
          <span style={{ fontSize: "13px", color: T.gray500 }}>Milestone Template</span>
        </div>

        {/* ══════════════════════════════════════════════════════════
            TWO-COLUMN LAYOUT
            Left column  — header, stats, milestone grid (flex: 1)
            Right column — permanent edit sidebar  (fixed 320px)
        ══════════════════════════════════════════════════════════ */}
        <div style={{
          display:   "flex",
          gap:       "20px",
          alignItems: "flex-start",
        }}>

          {/* ════════════ LEFT COLUMN ════════════ */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* ── Header card ───────────────────── */}
            <div style={{
              background:   T.cardBg,
              border:       T.cardBorder,
              borderRadius: T.cardRadius,
              boxShadow:    T.cardShadow,
              padding:      "24px 28px",
            }}>
              <h1 style={{ fontSize: "21px", fontWeight: "700", color: T.gray900, letterSpacing: "-0.015em", marginBottom: "6px" }}>
                {tmpl.name}
              </h1>
              <div style={{ fontFamily: T.mono, fontSize: "12px", color: T.gray400 }}>
                ID: {tmpl.id}&nbsp;&nbsp;·&nbsp;&nbsp;Last modified 2 days ago
              </div>

              {/* Stat cards */}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "20px" }}>
                <StatCard
                  icon={<IcoTruck />}
                  label="Shipments Using Template"
                  value={tmpl.shipmentsUsing}
                />
                <StatCard
                  icon={<IcoCheckList />}
                  label="Milestones in Template"
                  value={tmpl.milestones.length}
                />
                <StatCard
                  icon={<IcoBranch />}
                  label="Derived Templates"
                  value={tmpl.derivedTemplates}
                  prevValue={prevDerived}
                  animating={countAnim}
                  clickable
                  onClick={() => router.push(`/Super_user/milestone_templates_list?parent=${tmpl.id}`)}
                />
              </div>

              {/* View new copy banner — appears after save as copy */}
              {newCopyId && (
                <div style={{
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "space-between",
                  gap:          "12px",
                  marginTop:    "16px",
                  background:   T.greenBg,
                  border:       `1px solid ${T.greenBorder}`,
                  borderRadius: "10px",
                  padding:      "12px 16px",
                  animation:    "slideDown 0.22s ease",
                }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: T.green, marginBottom: "2px" }}>
                      Copy saved successfully
                    </div>
                    <div style={{ fontSize: "12px", color: "#065F46" }}>
                      The new template has been created with the added milestones. This template is unchanged.
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <button
                      onClick={() => router.push(`/Super_user/milestone_template/${newCopyId}`)}
                      style={{
                        ...solidBtn(T.green, "#fff"),
                        padding:      "8px 16px",
                        borderRadius: "8px",
                        fontSize:     "12px",
                        whiteSpace:   "nowrap",
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "0.87"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >
                      View New Copy
                    </button>
                    <button
                      onClick={() => setNewCopyId(null)}
                      style={{ ...ghostBtn, color: "#065F46" }}
                    >
                      <IcoX />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Milestone grid card ───────────── */}
            <div style={{
              background:   T.cardBg,
              border:       T.cardBorder,
              borderRadius: T.cardRadius,
              boxShadow:    T.cardShadow,
              padding:      "24px 28px",
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
                  pill={`${tmpl.milestones.length} milestones`}
                />
                {editMode && (
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

              {/* 3-column milestone grid */}
              <div style={{
                display:             "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap:                 "10px",
                padding:             editMode ? "14px" : "0",
                border:              editMode ? `1.5px dashed ${T.blueMid}` : "none",
                borderRadius:        "10px",
                background:          editMode ? "#F0F7FF" : "transparent",
                transition:          "all 0.22s ease",
              }}>
                {tmpl.milestones.map((m, i) => (
                  <MilestoneCard
                    key={m.id}
                    milestone={m}
                    index={i}
                    editMode={editMode}
                    onDragStart={() => onDragStart(i)}
                    onDragOver={() => onDragOver(i)}
                    onDrop={() => onDrop(i)}
                    onDragEnd={onDragEnd}
                    isDragOver={dragOver === i && dragIdx !== i}
                  />
                ))}
              </div>
            </div>

          </div>
          {/* ════════════ END LEFT COLUMN ════════════ */}

          {/* ════════════ RIGHT SIDEBAR ════════════ */}
          <div style={{
            width:        "300px",
            flexShrink:   0,
            display:      "flex",
            flexDirection:"column",
            gap:          "12px",
            position:     "sticky",
            top:          "32px",
          }}>
            <div style={{
              background:   T.cardBg,
              border:       T.cardBorder,
              borderRadius: T.cardRadius,
              boxShadow:    T.cardShadow,
              padding:      "22px 20px",
            }}>

              {/* Sidebar title */}
              <div style={{
                fontSize:     "13px",
                fontWeight:   "700",
                color:        T.gray900,
                marginBottom: "4px",
              }}>
                Template Actions
              </div>
              <div style={{ fontSize: "12px", color: T.gray500, marginBottom: "18px", lineHeight: "1.5" }}>
                Edit the template structure, add milestones, or manage this template.
              </div>

              {/* Edit / Exit button */}
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  style={{
                    ...solidBtn(T.blue, "#fff"),
                    width:          "100%",
                    padding:        "10px",
                    borderRadius:   "9px",
                    justifyContent: "center",
                    fontSize:       "13px",
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.87"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <IcoEdit /> Edit Template
                </button>
              ) : (
                <>
                  {/* ── Edit mode is active ── */}

                  {/* Active indicator */}
                  <div style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          "8px",
                    background:   T.blueBg,
                    border:       `1px solid ${T.blueBorder}`,
                    borderRadius: "8px",
                    padding:      "9px 12px",
                    marginBottom: "16px",
                  }}>
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: T.blue, flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: T.blue, fontWeight: "600" }}>Edit mode active</span>
                  </div>

                  {/* Add milestone button / form */}
                  {!showAdd ? (
                    <button
                      onClick={() => setShowAdd(true)}
                      style={{
                        display:        "flex",
                        alignItems:     "center",
                        justifyContent: "center",
                        gap:            "7px",
                        width:          "100%",
                        padding:        "10px",
                        background:     T.blueBg,
                        border:         `1.5px dashed ${T.blueMid}`,
                        borderRadius:   "9px",
                        color:          T.blue,
                        fontWeight:     "600",
                        fontSize:       "13px",
                        cursor:         "pointer",
                        fontFamily:     T.font,
                        transition:     "background 0.15s",
                        marginBottom:   "0",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#DBEAFE"}
                      onMouseLeave={e => e.currentTarget.style.background = T.blueBg}
                    >
                      <IcoPlus /> Add Milestone
                    </button>
                  ) : (
                    <div style={{ background: T.blueBg, border: `1px solid ${T.blueBorder}`, borderRadius: "10px", padding: "16px", marginTop: "12px", animation: "slideDown 0.18s ease" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: T.blue }}>New Milestone</span>
                        <button onClick={() => setShowAdd(false)} style={{ ...ghostBtn, color: T.gray400 }}><IcoX /></button>
                      </div>
                      <MilestoneForm onAdd={addMilestone} onClose={() => setShowAdd(false)} submitLabel="Add Milestone" />
                    </div>
                  )}

                  <Divider />

                  {/* Save as copy */}
                  <button
                    onClick={() => { setCopyName(tmpl.name + " (Copy)"); setShowCopy(true); }}
                    style={{
                      ...outlineBtn(T.blue, T.blueBorder, T.blueBg),
                      width:          "100%",
                      justifyContent: "center",
                      marginBottom:   "8px",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#DBEAFE"}
                    onMouseLeave={e => e.currentTarget.style.background = T.blueBg}
                  >
                    <IcoCopy /> Save as Copy
                  </button>

                  {/* Cancel */}
                  <button
                    onClick={exitEditMode}
                    style={{
                      ...outlineBtn(T.gray500, T.gray200, T.gray50),
                      width:          "100%",
                      justifyContent: "center",
                      marginBottom:   "8px",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = T.gray100}
                    onMouseLeave={e => e.currentTarget.style.background = T.gray50}
                  >
                    Cancel
                  </button>

                  {/* Delete — separated visually */}
                  <div style={{ borderTop: `1px solid ${T.gray200}`, paddingTop: "12px", marginTop: "4px" }}>
                    <button
                      onClick={() => setShowDelete(true)}
                      style={{
                        ...outlineBtn(T.red, T.redBorder, T.redBg),
                        width:          "100%",
                        justifyContent: "center",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#FEE2E2"}
                      onMouseLeave={e => e.currentTarget.style.background = T.redBg}
                    >
                      <IcoTrash /> Delete Template
                    </button>
                  </div>

                </>
              )}
            </div>
          </div>
          {/* ════════════ END RIGHT SIDEBAR ════════════ */}

        </div>
      </div>

      {/* ══ MODAL: Save as Copy ═══════════════════════════════════ */}
      {showCopy && (
        <Modal title="Save as New Copy" onClose={() => setShowCopy(false)}>
          <p style={{ fontSize: "13px", color: T.gray500, marginBottom: "20px", lineHeight: "1.65" }}>
            A new template will be created based on{" "}
            <strong style={{ color: T.gray900 }}>{tmpl.name}</strong>. The original template remains active and unchanged.
          </p>
          <div style={{ marginBottom: "20px" }}>
            <label style={lbl}>New Template Name</label>
            <input
              value={copyName}
              onChange={e => setCopyName(e.target.value)}
              style={inp}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowCopy(false)}
              style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50), padding: "9px 18px" }}
              onMouseEnter={e => e.currentTarget.style.background = T.gray100}
              onMouseLeave={e => e.currentTarget.style.background = T.gray50}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCopy}
              disabled={!copyName.trim()}
              style={{
                ...solidBtn(copyName.trim() ? T.blue : T.gray300, copyName.trim() ? "#fff" : T.gray500),
                padding:      "9px 22px",
                borderRadius: "8px",
                cursor:       copyName.trim() ? "pointer" : "not-allowed",
              }}
              onMouseEnter={e => { if (copyName.trim()) e.currentTarget.style.opacity = "0.87"; }}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Save Copy
            </button>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: Delete Template ════════════════════════════════ */}
      {showDelete && (
        <Modal title="Delete Template" titleColor={T.red} onClose={() => setShowDelete(false)}>
          {/* Warning banner */}
          <div style={{
            display:      "flex",
            gap:          "12px",
            background:   T.amberBg,
            border:       `1px solid ${T.amberBorder}`,
            borderRadius: "10px",
            padding:      "14px 16px",
            marginBottom: "18px",
          }}>
            <div style={{ color: T.amber, flexShrink: 0, paddingTop: "1px" }}>
              <IcoWarn />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#92400E", marginBottom: "4px" }}>
                {tmpl.shipmentsUsing} Active Shipments Affected
              </div>
              <div style={{ fontSize: "12px", color: "#B45309", lineHeight: "1.6" }}>
                This template is currently used by{" "}
                <strong>{tmpl.shipmentsUsing} ongoing shipments</strong>. It will remain active for those shipments and will only be fully removed once all of them are completed.
              </div>
            </div>
          </div>

          <p style={{ fontSize: "13px", color: T.gray500, marginBottom: "22px", lineHeight: "1.65" }}>
            After confirmation, no new shipments can be assigned this template.{" "}
            <strong style={{ color: T.gray900 }}>{tmpl.name}</strong> will be permanently deleted once all current shipments close.
          </p>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowDelete(false)}
              style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50), padding: "9px 18px" }}
              onMouseEnter={e => e.currentTarget.style.background = T.gray100}
              onMouseLeave={e => e.currentTarget.style.background = T.gray50}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              style={{ ...solidBtn(T.red, "#fff"), padding: "9px 22px", borderRadius: "8px" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.87"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <IcoTrash /> Confirm Delete
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}