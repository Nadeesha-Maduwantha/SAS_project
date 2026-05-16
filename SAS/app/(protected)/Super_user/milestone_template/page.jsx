"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { T, solidBtn, outlineBtn, ghostBtn, inp, lbl } from "@/styles/tokens";
import {
  IcoEdit, IcoTrash, IcoCopy, IcoX, IcoWarn,
  IcoTruck, IcoCheckList, IcoBranch,
  SectionHead, Modal,
} from "@/components/milestones/templateComponents";
import AssignTemplateModal from "@/components/milestones/AssignTemplateModal";
import MilestoneSequenceView from "@/components/milestones/Milestonesequenceview";
import MilestoneSequenceEdit from "@/components/milestones/Milestonesequenceedit";

// ── Stat Card ──────────────────────────────────────────────────────────────────
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
              <div style={{ fontSize: "20px", fontWeight: "700", color: T.gray900, lineHeight: "28px", position: "absolute", width: "100%", animation: "countExit 0.35s ease forwards" }}>{prevValue}</div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: T.blue,   lineHeight: "28px", position: "absolute", width: "100%", animation: "countEnter 0.35s ease forwards" }}>{value}</div>
            </>
          ) : (
            <div style={{ fontSize: "20px", fontWeight: "700", color: T.gray900, lineHeight: "28px" }}>{value}</div>
          )}
        </div>
      </div>
      {clickable && <span style={{ fontSize: "11px", color: T.blue, fontWeight: "600", flexShrink: 0 }}>View</span>}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function MilestoneTemplatePage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const templateId    = searchParams.get("id");
  const openInEdit    = searchParams.get("edit") === "true";
  const hasTemplateId = Boolean(templateId);

  // ── Data state ──────────────────────────────────────────────
  const [tmpl,    setTmpl]    = useState(null);
  const [loading, setLoading] = useState(hasTemplateId);
  const [error,   setError]   = useState(hasTemplateId ? null : "No template ID provided in the URL.");
  const [saving,  setSaving]  = useState(false);

  // ── UI state ────────────────────────────────────────────────
  const [editMode,    setEditMode]    = useState(openInEdit);
  const [showCopy,    setShowCopy]    = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);
  const [showAssign,  setShowAssign]  = useState(false);
  const [copyName,    setCopyName]    = useState("");
  const [toast]                       = useState(null);
  const [newCopyId,   setNewCopyId]   = useState(null);
  const [countAnim,   setCountAnim]   = useState(false);
  const [prevDerived, setPrevDerived] = useState(null);

  const onFocus = (e) => { e.target.style.borderColor = T.blue;    e.target.style.boxShadow = `0 0 0 3px ${T.blueBg}`; };
  const onBlur  = (e) => { e.target.style.borderColor = T.gray200; e.target.style.boxShadow = "none"; };

  // ── Fetch ───────────────────────────────────────────────────
  useEffect(() => {
    if (!templateId) return;
    (async () => {
      try {
        setError(null);
        const res    = await fetch(`http://localhost:5000/api/templates/${templateId}`);
        const result = await res.json();
        if (res.ok) setTmpl(result.data);
        else        setError(result.error || "Failed to load template");
      } catch {
        setError("Could not connect to server. Is Flask running?");
      } finally {
        setLoading(false);
      }
    })();
  }, [templateId]);

  // ── Safe values ─────────────────────────────────────────────
  const tmplName       = tmpl?.name              ?? "Loading...";
  const tmplId         = tmpl?.id                ?? "—";
  const milestones     = [...(tmpl?.template_milestones ?? [])].sort((a, b) => a.sequence_order - b.sequence_order);
  const shipmentsUsing = tmpl?.shipmentsUsing    ?? 0;
  const derivedCount   = tmpl?.derivedTemplates  ?? 0;

  // ── Handlers ────────────────────────────────────────────────
  const handleMilestonesChange = (updated) =>
    setTmpl(t => ({ ...t, template_milestones: updated }));

  const handleSave = async () => {
    if (!tmpl) return;
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:5000/api/templates/${tmpl.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:          tmpl.name,
          shipment_type: tmpl.shipment_type,
          description:   tmpl.description,
          milestones:    milestones.map((m, i) => ({ name: m.name, sequence_order: i })),
        }),
      });
      if (res.ok) setEditMode(false);
      else { const d = await res.json(); alert(d.error || "Failed to save"); }
    } catch {
      alert("Could not connect to server. Is Flask running?");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsCopy = async (name) => {
    setSaving(true);
    try {
      const res    = await fetch(`http://localhost:5000/api/templates/${tmpl.id}/copy`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = await res.json();
      if (res.ok) {
        setNewCopyId(result.data.id);
        setPrevDerived(tmpl.derivedTemplates);
        setTmpl(t => ({ ...t, derivedTemplates: (t.derivedTemplates || 0) + 1 }));
        setCountAnim(true); setTimeout(() => setCountAnim(false), 600);
        setEditMode(false);
      } else alert(result.error || "Failed to copy");
    } catch {
      alert("Could not connect to server. Is Flask running?");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCopyModal = async () => {
    if (!copyName.trim()) return;
    await handleSaveAsCopy(copyName);
    setShowCopy(false); setCopyName("");
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/templates/${tmpl.id}`, { method: "DELETE" });
      if (res.ok) { setShowDelete(false); router.push("/Super_user/milestone_templates_list"); }
      else { const d = await res.json(); alert(d.error || "Failed to delete"); }
    } catch {
      alert("Could not connect to server. Is Flask running?");
    }
  };

  // ── Render ──────────────────────────────────────────────────
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

      <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: T.font, color: T.gray900, padding: "32px 32px 80px" }}>

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

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "22px" }}>
          <span onClick={() => router.push("/Super_user/milestone_templates_list")}
            style={{ fontSize: "13px", color: T.blue, fontWeight: "500", cursor: "pointer" }}
            onMouseEnter={e => e.target.style.textDecoration = "underline"}
            onMouseLeave={e => e.target.style.textDecoration = "none"}
          >
            Templates
          </span>
          <span style={{ color: T.gray300, fontSize: "14px" }}>›</span>
          <span style={{ fontSize: "13px", color: T.gray500 }}>{tmplName}</span>
        </div>

        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>

          {/* ── LEFT COLUMN ── */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* Header card */}
            <div style={{ background: T.cardBg, border: T.cardBorder, borderRadius: T.cardRadius, boxShadow: T.cardShadow, padding: "24px 28px" }}>
              <h1 style={{ fontSize: "21px", fontWeight: "700", color: T.gray900, letterSpacing: "-0.015em", marginBottom: "6px" }}>{tmplName}</h1>
              <div style={{ fontFamily: T.mono, fontSize: "12px", color: T.gray400 }}>ID: {tmplId}</div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "20px" }}>
                <StatCard icon={<IcoTruck />}     label="Shipments Using Template" value={shipmentsUsing} />
                <StatCard icon={<IcoCheckList />} label="Milestones in Template"   value={milestones.length} />
                <StatCard icon={<IcoBranch />} label="Derived Templates" value={derivedCount}
                  prevValue={prevDerived} animating={countAnim} clickable
                  onClick={() => router.push(`/Super_user/milestone_templates_list?parent=${tmplId}`)}
                />
              </div>

              {newCopyId && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginTop: "16px",
                  background: T.greenBg, border: `1px solid ${T.greenBorder}`, borderRadius: "10px", padding: "12px 16px",
                }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: T.green, marginBottom: "2px" }}>Copy saved successfully</div>
                    <div style={{ fontSize: "12px", color: "#065F46" }}>The new template has been created. This template is unchanged.</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <button onClick={() => router.push(`/Super_user/milestone_template?id=${newCopyId}`)}
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

            {/* Milestone sequence card */}
            <div style={{ background: T.cardBg, border: T.cardBorder, borderRadius: T.cardRadius, boxShadow: T.cardShadow, padding: "24px 28px" }}>
              <div style={{ marginBottom: "18px" }}>
                <SectionHead
                  title="Milestone Sequence"
                  pill={loading ? "Loading..." : `${milestones.length} milestones`}
                />
              </div>

              {/* VIEW MODE — read-only component */}
              {!editMode && (
                <MilestoneSequenceView
                  milestones={milestones}
                  loading={loading}
                  error={error}
                />
              )}

              {/* EDIT MODE — editable component with save/copy built in */}
              {editMode && (
                <MilestoneSequenceEdit
                  milestones={milestones}
                  onChange={handleMilestonesChange}
                  onSave={handleSave}
                  onSaveAsCopy={handleSaveAsCopy}
                  saving={saving}
                  templateName={tmplName}
                />
              )}
            </div>

          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div style={{ width: "280px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px", position: "sticky", top: "32px" }}>
            <div style={{ background: T.cardBg, border: T.cardBorder, borderRadius: T.cardRadius, boxShadow: T.cardShadow, padding: "22px 20px" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: T.gray900, marginBottom: "4px" }}>Template Actions</div>
              <div style={{ fontSize: "12px", color: T.gray500, marginBottom: "18px", lineHeight: "1.5" }}>
                Edit the template structure, add milestones, or manage this template.
              </div>

              {!editMode ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {/* Edit */}
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

                  {/* Assign */}
                  <button
                    onClick={() => setShowAssign(true)}
                    disabled={loading || !tmpl}
                    style={{
                      ...outlineBtn(T.green, T.greenBorder, T.greenBg),
                      width: "100%", justifyContent: "center",
                      opacity: loading || !tmpl ? 0.5 : 1,
                      cursor: loading || !tmpl ? "not-allowed" : "pointer",
                    }}
                    onMouseEnter={e => { if (!loading && tmpl) e.currentTarget.style.background = "#D1FAE5"; }}
                    onMouseLeave={e => e.currentTarget.style.background = T.greenBg}
                  >
                    Assign to Shipments
                  </button>

                
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {/* Assign */}
                  <button
                    onClick={() => setShowAssign(true)}
                    style={{ ...outlineBtn(T.green, T.greenBorder, T.greenBg), width: "100%", justifyContent: "center" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#D1FAE5"}
                    onMouseLeave={e => e.currentTarget.style.background = T.greenBg}
                  >
                    Assign to Shipments
                  </button>

                  {/* Cancel */}
                  <button
                    onClick={() => setEditMode(false)}
                    style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50), width: "100%", justifyContent: "center" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.gray100}
                    onMouseLeave={e => e.currentTarget.style.background = T.gray50}
                  >
                    Cancel Edit
                  </button>

                  {/* Delete */}
                  <div style={{ borderTop: `1px solid ${T.gray200}`, paddingTop: "8px" }}>
                    <button
                      onClick={() => setShowDelete(true)}
                      style={{ ...outlineBtn(T.red, T.redBorder, T.redBg), width: "100%", justifyContent: "center" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#FEE2E2"}
                      onMouseLeave={e => e.currentTarget.style.background = T.redBg}
                    >
                      <IcoTrash /> Delete Template
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL: Save as Copy */}
      {showCopy && (
        <Modal title="Save as New Copy" onClose={() => setShowCopy(false)}>
          <p style={{ fontSize: "13px", color: T.gray500, marginBottom: "20px", lineHeight: "1.65" }}>
            A new template will be created based on <strong style={{ color: T.gray900 }}>{tmplName}</strong>. The original remains unchanged.
          </p>
          <div style={{ marginBottom: "20px" }}>
            <label style={lbl}>New Template Name</label>
            <input value={copyName} onChange={e => setCopyName(e.target.value)} style={inp} onFocus={onFocus} onBlur={onBlur} />
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={() => setShowCopy(false)} style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50), padding: "9px 18px" }}
              onMouseEnter={e => e.currentTarget.style.background = T.gray100} onMouseLeave={e => e.currentTarget.style.background = T.gray50}>
              Cancel
            </button>
            <button onClick={handleSaveCopyModal} disabled={!copyName.trim()}
              style={{ ...solidBtn(copyName.trim() ? T.blue : T.gray300, "#fff"), padding: "9px 22px", borderRadius: "8px", cursor: copyName.trim() ? "pointer" : "not-allowed" }}
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
                This template is used by <strong>{shipmentsUsing} ongoing shipments</strong>. Milestones already assigned will remain unchanged.
              </div>
            </div>
          </div>
          <p style={{ fontSize: "13px", color: T.gray500, marginBottom: "22px", lineHeight: "1.65" }}>
            <strong style={{ color: T.gray900 }}>{tmplName}</strong> will be soft-deleted. No new shipments can use it after this.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={() => setShowDelete(false)} style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50), padding: "9px 18px" }}
              onMouseEnter={e => e.currentTarget.style.background = T.gray100} onMouseLeave={e => e.currentTarget.style.background = T.gray50}>
              Cancel
            </button>
            <button onClick={handleDelete} style={{ ...solidBtn(T.red, "#fff"), padding: "9px 22px", borderRadius: "8px" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.87"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
              <IcoTrash /> Confirm Delete
            </button>
          </div>
        </Modal>
      )}

      {/* Assign Modal */}
      <AssignTemplateModal
        isOpen={showAssign}
        onClose={() => setShowAssign(false)}
        templateId={tmpl?.id}
        templateName={tmplName}
      />
    </>
  );
}