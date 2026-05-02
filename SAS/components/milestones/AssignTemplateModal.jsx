"use client";

// =============================================================
//  AssignTemplateModal.jsx
//  Path: components/milestones/AssignTemplateModal.jsx
//
//  Usage (any page):
//    import AssignTemplateModal from "@/components/milestones/AssignTemplateModal";
//    <AssignTemplateModal
//      isOpen={showAssign}
//      onClose={() => setShowAssign(false)}
//      templateId={tmpl.id}
//      templateName={tmpl.name}
//    />
// =============================================================

import { useState, useEffect } from "react";
import { T, solidBtn, outlineBtn, ghostBtn } from "@/styles/tokens";

const BASE = "http://localhost:5000";

// ── Icons ──────────────────────────────────────────────────────────────────────
const IcoX      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoCheck  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoSearch = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcoWarn   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

// ── Assignment type config ─────────────────────────────────────────────────────
const ASSIGN_TYPES = [
  {
    group: "Standard Types",
    items: [
      { id: "air_import", label: "Air Import",  desc: "Air freight arriving in Sri Lanka"  },
      { id: "air_export", label: "Air Export",  desc: "Air freight departing Sri Lanka"    },
      { id: "sea_import", label: "Sea Import",  desc: "Sea freight arriving in Sri Lanka"  },
      { id: "sea_export", label: "Sea Export",  desc: "Sea freight departing Sri Lanka"    },
    ],
  },
  {
    group: "Broad",
    items: [
      { id: "all", label: "All Shipments", desc: "Every shipment in the system" },
    ],
  },
  {
    group: "Filter By",
    items: [
      { id: "by_client", label: "By Client",         desc: "Filter by consignee or client name"   },
      { id: "by_branch", label: "By Branch",         desc: "Filter by branch code (e.g. CMB)"     },
      { id: "custom",    label: "Custom Selection",  desc: "Manually pick individual shipments"   },
    ],
  },
];

// ── Shared layout primitives ───────────────────────────────────────────────────
const OVERLAY = {
  position: "fixed", inset: 0, zIndex: 1000,
  background: "rgba(17,24,39,0.45)", backdropFilter: "blur(4px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  animation: "fadeIn 0.15s ease",
};

const baseCard = {
  background: T.cardBg, border: T.cardBorder, borderRadius: "16px",
  maxWidth: "94vw", maxHeight: "88vh",
  display: "flex", flexDirection: "column",
  boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  animation: "scaleIn 0.18s ease", overflow: "hidden",
};

function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.gray200}`, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: T.gray900 }}>{title}</div>
          {subtitle && <div style={{ fontSize: "12px", color: T.gray500, marginTop: "3px" }}>{subtitle}</div>}
        </div>
        <button onClick={onClose} style={{ ...ghostBtn, color: T.gray400, flexShrink: 0 }}><IcoX /></button>
      </div>
    </div>
  );
}

function ModalFooter({ children }) {
  return (
    <div style={{
      padding: "14px 24px", borderTop: `1px solid ${T.gray200}`,
      display: "flex", gap: "10px", justifyContent: "space-between",
      alignItems: "center", flexShrink: 0,
    }}>
      {children}
    </div>
  );
}

function RadioOption({ id, label, desc, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "10px 14px",
        border: `1.5px solid ${selected ? T.blue : T.gray200}`,
        borderRadius: "10px",
        background: selected ? T.blueBg : T.cardBg,
        cursor: "pointer", transition: "all 0.13s",
      }}
    >
      <div style={{
        width: "16px", height: "16px", borderRadius: "50%",
        border: `2px solid ${selected ? T.blue : T.gray300}`,
        background: selected ? T.blue : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "all 0.13s",
      }}>
        {selected && <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#fff" }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "13px", fontWeight: "600", color: selected ? T.blue : T.gray900 }}>{label}</div>
        <div style={{ fontSize: "11px", color: T.gray500, marginTop: "1px" }}>{desc}</div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AssignTemplateModal({ isOpen, onClose, templateId, templateName }) {

  // Step machine: 'type' → 'custom'? → 'preview' → 'success'
  const [step, setStep] = useState("type");

  // Step 1 state
  const [assignType,    setAssignType]    = useState("air_import");
  const [clientFilter,  setClientFilter]  = useState("");
  const [branchFilter,  setBranchFilter]  = useState("");

  // Step 2 (custom) state
  const [allShipments,      setAllShipments]      = useState([]);
  const [selectedIds,       setSelectedIds]        = useState(new Set());
  const [customSearch,      setCustomSearch]       = useState("");
  const [loadingShipments,  setLoadingShipments]   = useState(false);

  // Step 3 (preview) state
  const [previewShipments, setPreviewShipments] = useState([]);
  const [conflictCount,    setConflictCount]    = useState(0);
  const [conflictStrategy, setConflictStrategy] = useState("skip");
  const [loadingPreview,   setLoadingPreview]   = useState(false);

  // Assignment state
  const [assigning, setAssigning] = useState(false);
  const [result,    setResult]    = useState(null); // { assigned, skipped }
  const [error,     setError]     = useState(null);

  // ── Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep("type");
      setAssignType("air_import");
      setClientFilter("");
      setBranchFilter("");
      setAllShipments([]);
      setSelectedIds(new Set());
      setCustomSearch("");
      setPreviewShipments([]);
      setConflictCount(0);
      setConflictStrategy("skip");
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const toggleId = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredCustom = allShipments.filter(s => {
    if (!customSearch) return true;
    const q = customSearch.toLowerCase();
    return (s.job_number ?? "").toLowerCase().includes(q)
        || (s.consignee_name ?? "").toLowerCase().includes(q)
        || (s.branch ?? "").toLowerCase().includes(q);
  });

  // ── API: Load all shipments for custom picker
  const loadAllShipments = async () => {
    setLoadingShipments(true);
    setError(null);
    try {
      const res  = await fetch(`${BASE}/api/templates/${templateId}/preview-assignment?type=all`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load shipments");
      setAllShipments(data.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingShipments(false);
    }
  };

  // ── API: Fetch preview shipments
  const fetchPreview = async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      if (assignType === "custom") {
        // Use already-loaded shipments filtered by selection
        const selected = allShipments.filter(s => selectedIds.has(s.id));
        setPreviewShipments(selected);
        setConflictCount(selected.filter(s => s.has_milestones).length);
        setStep("preview");
        return;
      }

      const params = new URLSearchParams({ type: assignType });
      if (assignType === "by_client") params.append("consignee_name", clientFilter);
      if (assignType === "by_branch") params.append("branch", branchFilter);

      const res  = await fetch(`${BASE}/api/templates/${templateId}/preview-assignment?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch preview");

      setPreviewShipments(data.data ?? []);
      setConflictCount(data.conflict_count ?? 0);
      setStep("preview");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  // ── API: Execute assignment
  const handleAssign = async () => {
    setAssigning(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/templates/${templateId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipment_ids:      previewShipments.map(s => s.id),
          conflict_strategy: conflictStrategy,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assignment failed");
      setResult({ assigned: data.assigned, skipped: data.skipped });
      setStep("success");
    } catch (e) {
      setError(e.message);
    } finally {
      setAssigning(false);
    }
  };

  // ── Handle "Next" on type step
  const handleTypeNext = async () => {
    if (assignType === "by_client" && !clientFilter.trim()) return;
    if (assignType === "by_branch" && !branchFilter.trim()) return;
    if (assignType === "custom") {
      setStep("custom");
      await loadAllShipments();
    } else {
      await fetchPreview();
    }
  };

  // ══════════════════════════════════════════════════════════════
  //  STEP 1 — Choose Assignment Type
  // ══════════════════════════════════════════════════════════════
  if (step === "type") return (
    <div style={OVERLAY}>
      <div style={{ ...baseCard, width: "500px" }}>
        <ModalHeader
          title={`Assign "${templateName}"`}
          subtitle="Choose how to select shipments for this template"
          onClose={onClose}
        />

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {ASSIGN_TYPES.map(group => (
            <div key={group.group} style={{ marginBottom: "20px" }}>
              <div style={{
                fontSize: "10px", fontWeight: "700", color: T.gray400,
                letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "8px",
              }}>
                {group.group}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {group.items.map(type => (
                  <RadioOption
                    key={type.id}
                    {...type}
                    selected={assignType === type.id}
                    onClick={() => { setAssignType(type.id); setError(null); }}
                  />
                ))}
              </div>

              {/* Conditional inputs — shown under "Filter By" group */}
              {group.group === "Filter By" && assignType === "by_client" && (
                <div style={{ marginTop: "10px", paddingLeft: "2px" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: T.gray500, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "6px" }}>
                    Client / Consignee Name
                  </label>
                  <input
                    value={clientFilter}
                    onChange={e => setClientFilter(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    style={{ width: "100%", background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: "8px", padding: "9px 13px", color: T.gray900, fontSize: "13px", outline: "none", fontFamily: T.font, boxSizing: "border-box" }}
                    onFocus={e => { e.target.style.borderColor = T.blue; e.target.style.boxShadow = `0 0 0 3px ${T.blueBg}`; }}
                    onBlur={e =>  { e.target.style.borderColor = T.gray200; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              )}
              {group.group === "Filter By" && assignType === "by_branch" && (
                <div style={{ marginTop: "10px", paddingLeft: "2px" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: T.gray500, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "6px" }}>
                    Branch Code or Name
                  </label>
                  <input
                    value={branchFilter}
                    onChange={e => setBranchFilter(e.target.value)}
                    placeholder="e.g. CMB or Colombo"
                    style={{ width: "100%", background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: "8px", padding: "9px 13px", color: T.gray900, fontSize: "13px", outline: "none", fontFamily: T.font, boxSizing: "border-box" }}
                    onFocus={e => { e.target.style.borderColor = T.blue; e.target.style.boxShadow = `0 0 0 3px ${T.blueBg}`; }}
                    onBlur={e =>  { e.target.style.borderColor = T.gray200; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              )}
            </div>
          ))}

          {error && <div style={{ fontSize: "12px", color: T.red, padding: "10px 14px", background: T.redBg, borderRadius: "8px", border: `1px solid ${T.redBorder}` }}>{error}</div>}
        </div>

        <ModalFooter>
          <button onClick={onClose} style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50) }}>
            Cancel
          </button>
          <button
            onClick={handleTypeNext}
            disabled={
              loadingPreview ||
              (assignType === "by_client" && !clientFilter.trim()) ||
              (assignType === "by_branch" && !branchFilter.trim())
            }
            style={{
              ...solidBtn(T.blue, "#fff"),
              padding: "9px 20px",
              opacity: loadingPreview ? 0.7 : 1,
              cursor: loadingPreview ? "not-allowed" : "pointer",
            }}
          >
            {loadingPreview
              ? "Loading..."
              : assignType === "custom"
              ? "Choose Shipments →"
              : "Preview Shipments →"}
          </button>
        </ModalFooter>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  STEP 2 — Custom Shipment Picker
  // ══════════════════════════════════════════════════════════════
  if (step === "custom") return (
    <div style={OVERLAY}>
      <div style={{ ...baseCard, width: "580px" }}>
        <ModalHeader
          title="Select Shipments"
          subtitle={`${selectedIds.size} shipment${selectedIds.size !== 1 ? "s" : ""} selected`}
          onClose={onClose}
        />

        {/* Search bar */}
        <div style={{ padding: "12px 24px", borderBottom: `1px solid ${T.gray200}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: "8px", padding: "8px 12px" }}>
            <span style={{ color: T.gray400 }}><IcoSearch /></span>
            <input
              value={customSearch}
              onChange={e => setCustomSearch(e.target.value)}
              placeholder="Search by job number, client, or branch..."
              style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", color: T.gray900, flex: 1, fontFamily: T.font }}
            />
          </div>
        </div>

        {/* Shipment list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 24px" }}>
          {loadingShipments ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: "10px" }}>
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: `2px solid ${T.gray200}`, borderTopColor: T.blue, animation: "spin 0.7s linear infinite" }} />
              <span style={{ fontSize: "13px", color: T.gray400 }}>Loading shipments...</span>
            </div>
          ) : filteredCustom.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", fontSize: "13px", color: T.gray400 }}>
              No shipments found.
            </div>
          ) : (
            filteredCustom.map(s => {
              const checked = selectedIds.has(s.id);
              return (
                <div
                  key={s.id}
                  onClick={() => toggleId(s.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "10px 12px", borderRadius: "8px", marginBottom: "3px",
                    background: checked ? T.blueBg : "transparent",
                    border: `1px solid ${checked ? T.blueBorder : "transparent"}`,
                    cursor: "pointer", transition: "all 0.12s",
                  }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "4px",
                    border: `2px solid ${checked ? T.blue : T.gray300}`,
                    background: checked ? T.blue : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, color: "#fff",
                  }}>
                    {checked && <IcoCheck />}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: T.gray900, fontFamily: T.mono }}>{s.job_number ?? s.id.slice(0, 8)}</div>
                    <div style={{ fontSize: "11px", color: T.gray500 }}>
                      {s.consignee_name ?? "—"}
                      {s.branch ? <span style={{ marginLeft: "8px", color: T.gray400 }}>· {s.branch}</span> : null}
                    </div>
                  </div>
                  {/* Conflict badge */}
                  {s.has_milestones && (
                    <span style={{
                      fontSize: "10px", fontWeight: "600",
                      color: T.amber, background: T.amberBg, border: `1px solid ${T.amberBorder}`,
                      padding: "2px 7px", borderRadius: "4px", flexShrink: 0,
                    }}>
                      Has milestones
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <ModalFooter>
          <button onClick={() => setStep("type")} style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50) }}>← Back</button>
          <button
            onClick={() => fetchPreview()}
            disabled={selectedIds.size === 0 || loadingPreview}
            style={{
              ...solidBtn(selectedIds.size > 0 ? T.blue : T.gray300, "#fff"),
              padding: "9px 20px",
              cursor: selectedIds.size > 0 && !loadingPreview ? "pointer" : "not-allowed",
            }}
          >
            {loadingPreview ? "Loading..." : `Preview ${selectedIds.size} Shipment${selectedIds.size !== 1 ? "s" : ""} →`}
          </button>
        </ModalFooter>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  STEP 3 — Preview & Confirm
  // ══════════════════════════════════════════════════════════════
  if (step === "preview") return (
    <div style={OVERLAY}>
      <div style={{ ...baseCard, width: "540px" }}>
        <ModalHeader
          title="Confirm Assignment"
          subtitle={`${previewShipments.length} shipment${previewShipments.length !== 1 ? "s" : ""} selected`}
          onClose={onClose}
        />

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Summary stats */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <div style={{ flex: 1, background: T.blueBg, border: `1px solid ${T.blueBorder}`, borderRadius: "8px", padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "700", color: T.blue }}>{previewShipments.length}</div>
              <div style={{ fontSize: "11px", color: T.gray500, marginTop: "2px" }}>Total</div>
            </div>
            <div style={{ flex: 1, background: T.greenBg, border: `1px solid ${T.greenBorder}`, borderRadius: "8px", padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "700", color: T.green }}>{previewShipments.length - conflictCount}</div>
              <div style={{ fontSize: "11px", color: T.gray500, marginTop: "2px" }}>Clean</div>
            </div>
            <div style={{ flex: 1, background: conflictCount > 0 ? T.amberBg : T.gray50, border: `1px solid ${conflictCount > 0 ? T.amberBorder : T.gray200}`, borderRadius: "8px", padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "700", color: conflictCount > 0 ? T.amber : T.gray400 }}>{conflictCount}</div>
              <div style={{ fontSize: "11px", color: T.gray500, marginTop: "2px" }}>Conflicts</div>
            </div>
          </div>

          {/* Conflict strategy — only shown if there are conflicts */}
          {conflictCount > 0 && (
            <div style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}`, borderRadius: "10px", padding: "14px 16px", marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "12px" }}>
                <span style={{ color: T.amber, flexShrink: 0, paddingTop: "1px" }}><IcoWarn /></span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#92400E" }}>
                    {conflictCount} shipment{conflictCount !== 1 ? "s" : ""} already have milestones
                  </div>
                  <div style={{ fontSize: "12px", color: "#B45309", marginTop: "2px" }}>
                    How should these be handled?
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "26px" }}>
                {[
                  { val: "skip",    label: "Skip — keep existing milestones unchanged"     },
                  { val: "replace", label: "Replace — delete existing and assign new ones" },
                ].map(opt => (
                  <div
                    key={opt.val}
                    onClick={() => setConflictStrategy(opt.val)}
                    style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
                  >
                    <div style={{
                      width: "14px", height: "14px", borderRadius: "50%",
                      border: `2px solid ${conflictStrategy === opt.val ? T.amber : T.gray300}`,
                      background: conflictStrategy === opt.val ? T.amber : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {conflictStrategy === opt.val && <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#fff" }} />}
                    </div>
                    <span style={{ fontSize: "12px", color: "#92400E", fontWeight: conflictStrategy === opt.val ? "600" : "400" }}>
                      {opt.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shipment list */}
          <div style={{ border: `1px solid ${T.gray200}`, borderRadius: "10px", overflow: "hidden" }}>
            {previewShipments.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: T.gray400, fontSize: "13px" }}>
                No shipments match this criteria.
              </div>
            ) : (
              previewShipments.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "10px 14px",
                    borderTop: i > 0 ? `1px solid ${T.gray100}` : "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: T.gray900, fontFamily: T.mono }}>
                      {s.job_number ?? s.id.slice(0, 8)}
                    </div>
                    <div style={{ fontSize: "11px", color: T.gray500 }}>
                      {s.consignee_name ?? "—"}
                      {s.branch ? <span style={{ marginLeft: "8px", color: T.gray400 }}>· {s.branch}</span> : null}
                    </div>
                  </div>
                  {s.has_milestones && (
                    <span style={{
                      fontSize: "10px", fontWeight: "600", padding: "2px 7px", borderRadius: "4px", flexShrink: 0,
                      color:      conflictStrategy === "replace" ? T.red   : T.amber,
                      background: conflictStrategy === "replace" ? T.redBg : T.amberBg,
                      border:     `1px solid ${conflictStrategy === "replace" ? T.redBorder : T.amberBorder}`,
                    }}>
                      {conflictStrategy === "replace" ? "Will replace" : "Will skip"}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {error && (
            <div style={{ fontSize: "12px", color: T.red, marginTop: "12px", padding: "10px 14px", background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: "8px" }}>
              {error}
            </div>
          )}
        </div>

        <ModalFooter>
          <button
            onClick={() => setStep(assignType === "custom" ? "custom" : "type")}
            style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50) }}
          >
            ← Back
          </button>
          <button
            onClick={handleAssign}
            disabled={assigning || previewShipments.length === 0}
            style={{
              ...solidBtn(previewShipments.length > 0 ? T.blue : T.gray300, "#fff"),
              padding: "9px 20px",
              opacity: assigning ? 0.7 : 1,
              cursor: previewShipments.length > 0 && !assigning ? "pointer" : "not-allowed",
            }}
          >
            {assigning
              ? "Assigning..."
              : `Assign to ${previewShipments.length} Shipment${previewShipments.length !== 1 ? "s" : ""}`}
          </button>
        </ModalFooter>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  STEP 4 — Success
  // ══════════════════════════════════════════════════════════════
  if (step === "success") return (
    <div style={OVERLAY}>
      <div style={{ ...baseCard, width: "420px" }}>
        <div style={{ padding: "40px 32px", textAlign: "center" }}>
          {/* Green check circle */}
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%",
            background: T.greenBg, border: `2px solid ${T.greenBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", color: T.green,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>

          <div style={{ fontSize: "17px", fontWeight: "700", color: T.gray900, marginBottom: "10px" }}>
            Template Assigned
          </div>
          <div style={{ fontSize: "13px", color: T.gray500, lineHeight: "1.7", marginBottom: "28px" }}>
            <strong style={{ color: T.green }}>{result?.assigned}</strong>{" "}
            shipment{result?.assigned !== 1 ? "s" : ""} successfully assigned.
            {result?.skipped > 0 && (
              <>
                {" "}<strong style={{ color: T.amber }}>{result.skipped}</strong>{" "}
                skipped (had existing milestones).
              </>
            )}
          </div>

          <button
            onClick={onClose}
            style={{ ...solidBtn(T.blue, "#fff"), padding: "10px 28px", borderRadius: "9px" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.87"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return null;
}