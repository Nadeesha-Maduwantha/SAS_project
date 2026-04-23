"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { T, solidBtn, outlineBtn, ghostBtn, inp, lbl } from "@/styles/tokens";
import {
  IcoEdit, IcoPlus, IcoTrash, IcoCopy, IcoX, IcoWarn,
  IcoTruck, IcoCheckList, IcoBranch,
  SectionHead, Divider,
  MilestoneCard, MilestoneForm, Modal,
} from "@/app/(protected)/admin/milestone_templates_list/components/templateComponents";

// =============================================================
//  STAT CARD
// =============================================================
function StatCard({ icon, label, value, prevValue, animating, clickable, onClick }) {
  const [hov, setHov] = useState(false);
  const showAnim = animating && prevValue !== undefined && prevValue !== value;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, minWidth: "160px",
        background: T.cardBg, border: T.cardBorder, borderRadius: "12px",
        boxShadow: hov && clickable ? T.cardShadowHover : T.cardShadow,
        padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px",
        cursor: clickable ? "pointer" : "default",
        transition: "box-shadow 0.18s, transform 0.18s",
        transform: hov && clickable ? "translateY(-2px)" : "none",
      }}
    >
      <div style={{
        width: "38px", height: "38px", borderRadius: "9px",
        background: T.blueBg, border: `1px solid ${T.blueBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "11px", color: T.gray500, fontWeight: "500", letterSpacing: "0.03em", marginBottom: "3px" }}>
          {label}
        </div>
        <div style={{ overflow: "hidden", height: "28px", position: "relative" }}>
          {showAnim ? (
            <>
              <div style={{ fontSize: "20px", fontWeight: "700", color: T.gray900, lineHeight: "28px", position: "absolute", width: "100%", animation: "countExit 0.35s ease forwards" }}>
                {prevValue}
              </div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: T.blue, lineHeight: "28px", position: "absolute", width: "100%", animation: "countEnter 0.35s ease forwards" }}>
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
      {clickable && <span style={{ fontSize: "11px", color: T.blue, fontWeight: "600", flexShrink: 0 }}>View</span>}
    </div>
  );
}

// =============================================================
//  PAGE
// =============================================================
export default function MilestoneTemplatePage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const templateId   = searchParams.get("id");
  const openInEdit   = searchParams.get("edit") === "true";
  const hasTemplateId = Boolean(templateId);

  // ── Data state ──────────────────────────────────────────────
  const [tmpl,    setTmpl]    = useState(null);
  const [loading, setLoading] = useState(hasTemplateId);
  const [error,   setError]   = useState(hasTemplateId ? null : "No template ID provided in the URL.");

  // ── UI state ────────────────────────────────────────────────
  const [editMode,    setEditMode]    = useState(openInEdit);
  const [showAdd,     setShowAdd]     = useState(false);
  const [showCopy,    setShowCopy]    = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);
  const [copyName,    setCopyName]    = useState("");
  const [toast]       = useState(null);
  const [dragIdx,     setDragIdx]     = useState(null);
  const [dragOver,    setDragOver]    = useState(null);
  const [newCopyId,   setNewCopyId]   = useState(null);
  const [countAnim,   setCountAnim]   = useState(false);
  const [prevDerived, setPrevDerived] = useState(null);

  // ── Fetch from Flask ────────────────────────────────────────
  useEffect(() => {
    if (!templateId) return;
    const fetchTemplate = async () => {
      try {
        setError(null);
        const response = await fetch(`http://localhost:5000/api/templates/${templateId}`);
        const result   = await response.json();
        if (response.ok) {
          setTmpl(result.data);
        } else {
          setError(result.error || "Failed to load template");
        }
      } catch {
        setError("Could not connect to server. Is Flask running?");
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [templateId]);

  // ── Helpers ─────────────────────────────────────────────────
  const onDragStart = (i) => setDragIdx(i);
  const onDragOver  = (i) => setDragOver(i);
  const onDrop      = (i) => {
    if (dragIdx === null || dragIdx === i) return;
    const arr = [...(tmpl?.template_milestones ?? [])];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(i, 0, moved);
    setTmpl(t => ({ ...t, template_milestones: arr }));
    setDragIdx(null); setDragOver(null);
  };
  const onDragEnd    = () => { setDragIdx(null); setDragOver(null); };
  const addMilestone = (m) => setTmpl(t => ({ ...t, template_milestones: [...(t.template_milestones ?? []), m] }));
  const exitEditMode = () => { setEditMode(false); setShowAdd(false); };

  const onFocus = (e) => { e.target.style.borderColor = T.blue;    e.target.style.boxShadow = `0 0 0 3px ${T.blueBg}`; };
  const onBlur  = (e) => { e.target.style.borderColor = T.gray200; e.target.style.boxShadow = "none"; };

  // ── API actions ─────────────────────────────────────────────
  const handleSaveCopy = async () => {
    if (!copyName.trim()) return;
    try {
      const response = await fetch(`http://localhost:5000/api/templates/${tmpl.id}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: copyName }),
      });
      const result = await response.json();
      if (response.ok) {
        setShowCopy(false); setCopyName(""); exitEditMode();
        setNewCopyId(result.data.id);
        setPrevDerived(tmpl.derivedTemplates);
        setTmpl(t => ({ ...t, derivedTemplates: (t.derivedTemplates || 0) + 1 }));
        setCountAnim(true);
        setTimeout(() => setCountAnim(false), 600);
      } else {
        alert(result.error || "Failed to copy template");
      }
    } catch {
      alert("Could not connect to server. Is Flask running?");
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/templates/${tmpl.id}`, { method: "DELETE" });
      if (response.ok) {
        setShowDelete(false);
        router.push("/admin/milestone_templates_list");
      } else {
        const result = await response.json();
        alert(result.error || "Failed to delete");
      }
    } catch {
      alert("Could not connect to server. Is Flask running?");
    }
  };

  // ── Safe values — used throughout the JSX ───────────────────
  // These prevent crashes when tmpl is null (still loading)
  // Instead of tmpl.name which crashes, we use tmpl?.name ?? "..."
  // The ?. means "if tmpl exists, read .name, otherwise undefined"
  // The ?? means "if the left side is null/undefined, use the right side"
  const tmplName       = tmpl?.name       ?? "Loading...";
  const tmplId         = tmpl?.id         ?? "—";
  const milestones     = (tmpl?.template_milestones ?? [])
                           .sort((a, b) => a.sequence_order - b.sequence_order);
  const shipmentsUsing = tmpl?.shipmentsUsing  ?? 0;
  const derivedCount   = tmpl?.derivedTemplates ?? 0;

  // ── Milestone area content — three possible states ──────────
  // Instead of returning early and hiding the whole page,
  // we render different content INSIDE the milestones card only
  const milestoneAreaContent = (() => {

    // State 1 — still fetching from Flask
    if (loading) return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 20px", gap: "12px",
      }}>
        <div style={{
          width: "18px", height: "18px", borderRadius: "50%",
          border: `2px solid ${T.gray200}`,
          borderTopColor: T.blue,
          animation: "spin 0.7s linear infinite",
        }} />
        <span style={{ fontSize: "13px", color: T.gray400 }}>Loading milestones...</span>
      </div>
    );

    // State 2 — fetch failed (Flask not running, network error)
    if (error) return (
      <div style={{
        margin: "0",
        padding: "20px 24px",
        background: "#fef2f2",
        border: `1px solid #fecaca`,
        borderRadius: "10px",
        fontSize: "13px",
        color: "#dc2626",
        lineHeight: "1.6",
      }}>
        <strong>Could not load milestones.</strong><br />
        <span style={{ fontSize: "12px", color: "#6b7280" }}>{error}</span>
      </div>
    );

    // State 3 — loaded but zero milestones in this template
    if (milestones.length === 0) return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "52px 20px",
        border: `1.5px dashed ${T.gray200}`,
        borderRadius: "10px", textAlign: "center",
      }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "10px",
          background: T.gray100, display: "flex",
          alignItems: "center", justifyContent: "center", marginBottom: "12px",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.gray400} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </div>
        <div style={{ fontSize: "14px", fontWeight: "600", color: T.gray500, marginBottom: "6px" }}>
          No milestones in this template
        </div>
        <div style={{ fontSize: "12px", color: T.gray400, maxWidth: "220px", lineHeight: "1.6" }}>
          Switch to edit mode and use &quot;Add Milestone&quot; to build the sequence.
        </div>
      </div>
    );

    // State 4 — milestones loaded, show the grid
    return (
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px",
        padding: editMode ? "14px" : "0",
        border: editMode ? `1.5px dashed ${T.blueMid}` : "none",
        borderRadius: "10px",
        background: editMode ? "#F0F7FF" : "transparent",
        transition: "all 0.22s ease",
      }}>
        {milestones.map((m, i) => (
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
    );
  })();

  // ── Main render — page always renders regardless of load state
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        @keyframes fadeIn     { from{opacity:0} to{opacity:1} }
        @keyframes scaleIn    { from{transform:scale(0.96);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes slideDown  { from{transform:translateY(-8px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes toastIn    { from{transform:translateY(-12px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes countExit  { from{transform:translateY(0);opacity:1} to{transform:translateY(-28px);opacity:0} }
        @keyframes countEnter { from{transform:translateY(28px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes spin       { to{transform:rotate(360deg)} }
      `}</style>

      <div style={{
        minHeight: "100vh", background: T.pageBg,
        fontFamily: T.font, color: T.gray900, padding: "32px 32px 80px",
      }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", top: "24px", right: "24px", zIndex: 2000,
            background: toast.type === "warning" ? T.amberBg : T.greenBg,
            border: `1px solid ${toast.type === "warning" ? T.amberBorder : T.greenBorder}`,
            color: toast.type === "warning" ? T.amber : T.green,
            borderRadius: "10px", padding: "12px 20px", fontSize: "13px",
            fontWeight: "600", boxShadow: T.cardShadow, animation: "toastIn 0.2s ease",
          }}>
            {toast.msg}
          </div>
        )}

        {/* Breadcrumb — always visible */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "22px" }}>
          <span
            onClick={() => router.push("/admin/milestone_templates_list")}
            style={{ fontSize: "13px", color: T.blue, fontWeight: "500", cursor: "pointer" }}
            onMouseEnter={e => e.target.style.textDecoration = "underline"}
            onMouseLeave={e => e.target.style.textDecoration = "none"}
          >
            Templates
          </span>
          <span style={{ color: T.gray300, fontSize: "14px" }}>›</span>
          {/* Shows "Loading..." until tmpl is ready */}
          <span style={{ fontSize: "13px", color: T.gray500 }}>{tmplName}</span>
        </div>

        {/* Two-column layout — always visible */}
        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>

          {/* LEFT COLUMN */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* Header card — always visible, safe values prevent crashes */}
            <div style={{
              background: T.cardBg, border: T.cardBorder,
              borderRadius: T.cardRadius, boxShadow: T.cardShadow, padding: "24px 28px",
            }}>
              <h1 style={{ fontSize: "21px", fontWeight: "700", color: T.gray900, letterSpacing: "-0.015em", marginBottom: "6px" }}>
                {tmplName}
              </h1>
              <div style={{ fontFamily: T.mono, fontSize: "12px", color: T.gray400 }}>
                ID: {tmplId}&nbsp;&nbsp;·&nbsp;&nbsp;Last modified 2 days ago
              </div>

              {/* Stat cards */}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "20px" }}>
                <StatCard icon={<IcoTruck />}     label="Shipments Using Template" value={shipmentsUsing} />
                <StatCard icon={<IcoCheckList />} label="Milestones in Template"   value={milestones.length} />
                <StatCard
                  icon={<IcoBranch />}
                  label="Derived Templates"
                  value={derivedCount}
                  prevValue={prevDerived}
                  animating={countAnim}
                  clickable
                  onClick={() => router.push(`/admin/milestone_templates_list?parent=${tmplId}`)}
                />
              </div>

              {/* Copy success banner */}
              {newCopyId && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: "12px", marginTop: "16px",
                  background: T.greenBg, border: `1px solid ${T.greenBorder}`,
                  borderRadius: "10px", padding: "12px 16px", animation: "slideDown 0.22s ease",
                }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: T.green, marginBottom: "2px" }}>Copy saved successfully</div>
                    <div style={{ fontSize: "12px", color: "#065F46" }}>The new template has been created. This template is unchanged.</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <button
                      onClick={() => router.push(`/admin/milestone_template?id=${newCopyId}`)}
                      style={{ ...solidBtn(T.green, "#fff"), padding: "8px 16px", borderRadius: "8px", fontSize: "12px" }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "0.87"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >
                      View New Copy
                    </button>
                    <button onClick={() => setNewCopyId(null)} style={{ ...ghostBtn, color: "#065F46" }}><IcoX /></button>
                  </div>
                </div>
              )}
            </div>

            {/* Milestone grid card — always visible, content changes based on state */}
            <div style={{
              background: T.cardBg, border: T.cardBorder,
              borderRadius: T.cardRadius, boxShadow: T.cardShadow, padding: "24px 28px",
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap", gap: "10px", marginBottom: "18px",
              }}>
                <SectionHead
                  title="Milestone Sequence"
                  pill={loading ? "Loading..." : `${milestones.length} milestones`}
                />
                {editMode && !loading && (
                  <span style={{
                    fontSize: "12px", color: T.blue, background: T.blueBg,
                    border: `1px solid ${T.blueBorder}`, padding: "4px 12px",
                    borderRadius: "20px", fontWeight: "500",
                  }}>
                    Drag cards to reorder
                  </span>
                )}
              </div>

              {/* This renders one of 4 states: loading / error / empty / grid */}
              {milestoneAreaContent}
            </div>

          </div>
          {/* END LEFT COLUMN */}

          {/* RIGHT SIDEBAR — always visible */}
          <div style={{
            width: "300px", flexShrink: 0,
            display: "flex", flexDirection: "column", gap: "12px",
            position: "sticky", top: "32px",
          }}>
            <div style={{
              background: T.cardBg, border: T.cardBorder,
              borderRadius: T.cardRadius, boxShadow: T.cardShadow, padding: "22px 20px",
            }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: T.gray900, marginBottom: "4px" }}>
                Template Actions
              </div>
              <div style={{ fontSize: "12px", color: T.gray500, marginBottom: "18px", lineHeight: "1.5" }}>
                Edit the template structure, add milestones, or manage this template.
              </div>

              {/* Disable edit button while still loading */}
              {!editMode ? (
                <button
                  onClick={() => { if (!loading && tmpl) setEditMode(true); }}
                  disabled={loading || !tmpl}
                  style={{
                    ...solidBtn(loading || !tmpl ? T.gray300 : T.blue, "#fff"),
                    width: "100%", padding: "10px", borderRadius: "9px",
                    justifyContent: "center", fontSize: "13px",
                    cursor: loading || !tmpl ? "not-allowed" : "pointer",
                    opacity: loading || !tmpl ? 0.6 : 1,
                  }}
                  onMouseEnter={e => { if (!loading && tmpl) e.currentTarget.style.opacity = "0.87"; }}
                  onMouseLeave={e => e.currentTarget.style.opacity = loading || !tmpl ? "0.6" : "1"}
                >
                  <IcoEdit /> {loading ? "Loading..." : "Edit Template"}
                </button>
              ) : (
                <>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    background: T.blueBg, border: `1px solid ${T.blueBorder}`,
                    borderRadius: "8px", padding: "9px 12px", marginBottom: "16px",
                  }}>
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: T.blue, flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: T.blue, fontWeight: "600" }}>Edit mode active</span>
                  </div>

                  {!showAdd ? (
                    <button
                      onClick={() => setShowAdd(true)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                        width: "100%", padding: "10px",
                        background: T.blueBg, border: `1.5px dashed ${T.blueMid}`,
                        borderRadius: "9px", color: T.blue, fontWeight: "600",
                        fontSize: "13px", cursor: "pointer", fontFamily: T.font,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#DBEAFE"}
                      onMouseLeave={e => e.currentTarget.style.background = T.blueBg}
                    >
                      <IcoPlus /> Add Milestone
                    </button>
                  ) : (
                    <div style={{
                      background: T.blueBg, border: `1px solid ${T.blueBorder}`,
                      borderRadius: "10px", padding: "16px", marginTop: "12px",
                      animation: "slideDown 0.18s ease",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: T.blue }}>New Milestone</span>
                        <button onClick={() => setShowAdd(false)} style={{ ...ghostBtn, color: T.gray400 }}><IcoX /></button>
                      </div>
                      <MilestoneForm onAdd={addMilestone} onClose={() => setShowAdd(false)} submitLabel="Add Milestone" />
                    </div>
                  )}

                  <Divider />

                  <button
                    onClick={() => { setCopyName(tmpl.name + " (Copy)"); setShowCopy(true); }}
                    style={{ ...outlineBtn(T.blue, T.blueBorder, T.blueBg), width: "100%", justifyContent: "center", marginBottom: "8px" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#DBEAFE"}
                    onMouseLeave={e => e.currentTarget.style.background = T.blueBg}
                  >
                    <IcoCopy /> Save as Copy
                  </button>

                  <button
                    onClick={exitEditMode}
                    style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50), width: "100%", justifyContent: "center", marginBottom: "8px" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.gray100}
                    onMouseLeave={e => e.currentTarget.style.background = T.gray50}
                  >
                    Cancel
                  </button>

                  <div style={{ borderTop: `1px solid ${T.gray200}`, paddingTop: "12px", marginTop: "4px" }}>
                    <button
                      onClick={() => setShowDelete(true)}
                      style={{ ...outlineBtn(T.red, T.redBorder, T.redBg), width: "100%", justifyContent: "center" }}
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
          {/* END RIGHT SIDEBAR */}

        </div>
      </div>

      {/* MODAL: Save as Copy */}
      {showCopy && (
        <Modal title="Save as New Copy" onClose={() => setShowCopy(false)}>
          <p style={{ fontSize: "13px", color: T.gray500, marginBottom: "20px", lineHeight: "1.65" }}>
            A new template will be created based on <strong style={{ color: T.gray900 }}>{tmplName}</strong>. The original template remains unchanged.
          </p>
          <div style={{ marginBottom: "20px" }}>
            <label style={lbl}>New Template Name</label>
            <input value={copyName} onChange={e => setCopyName(e.target.value)} style={inp} onFocus={onFocus} onBlur={onBlur} />
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={() => setShowCopy(false)} style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50), padding: "9px 18px" }} onMouseEnter={e => e.currentTarget.style.background = T.gray100} onMouseLeave={e => e.currentTarget.style.background = T.gray50}>Cancel</button>
            <button
              onClick={handleSaveCopy}
              disabled={!copyName.trim()}
              style={{ ...solidBtn(copyName.trim() ? T.blue : T.gray300, copyName.trim() ? "#fff" : T.gray500), padding: "9px 22px", borderRadius: "8px", cursor: copyName.trim() ? "pointer" : "not-allowed" }}
              onMouseEnter={e => { if (copyName.trim()) e.currentTarget.style.opacity = "0.87"; }}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Save Copy
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL: Delete */}
      {showDelete && tmpl && (
        <Modal title="Delete Template" titleColor={T.red} onClose={() => setShowDelete(false)}>
          <div style={{ display: "flex", gap: "12px", background: T.amberBg, border: `1px solid ${T.amberBorder}`, borderRadius: "10px", padding: "14px 16px", marginBottom: "18px" }}>
            <div style={{ color: T.amber, flexShrink: 0, paddingTop: "1px" }}><IcoWarn /></div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#92400E", marginBottom: "4px" }}>{shipmentsUsing} Active Shipments Affected</div>
              <div style={{ fontSize: "12px", color: "#B45309", lineHeight: "1.6" }}>
                This template is currently used by <strong>{shipmentsUsing} ongoing shipments</strong>. It will remain active for those shipments until they are completed.
              </div>
            </div>
          </div>
          <p style={{ fontSize: "13px", color: T.gray500, marginBottom: "22px", lineHeight: "1.65" }}>
            After confirmation, no new shipments can be assigned this template. <strong style={{ color: T.gray900 }}>{tmplName}</strong> will be permanently deleted once all current shipments close.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={() => setShowDelete(false)} style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50), padding: "9px 18px" }} onMouseEnter={e => e.currentTarget.style.background = T.gray100} onMouseLeave={e => e.currentTarget.style.background = T.gray50}>Cancel</button>
            <button onClick={handleDelete} style={{ ...solidBtn(T.red, "#fff"), padding: "9px 22px", borderRadius: "8px" }} onMouseEnter={e => e.currentTarget.style.opacity = "0.87"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
              <IcoTrash /> Confirm Delete
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
