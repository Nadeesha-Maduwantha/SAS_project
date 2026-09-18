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
import FieldSelector from "@/components/milestones/MilestoneBuilder/FieldSelector";

// Due-date bases the admin can pick per manual milestone at assign time —
// mirrors the milestone builder's "When is this milestone due?" options.
const DUE_BASES = [
  { value: "manual",                   label: "Specific date" },
  { value: "another_field",            label: "From a date field" },
  { value: "days_after_creation",      label: "Days after shipment created" },
  { value: "after_previous_milestone", label: "After previous milestone" },
];

const BASE = "http://127.0.0.1:5000";

// ── Icons ──────────────────────────────────────────────────────────────────────
const IcoX      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoCheck  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoSearch = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcoWarn   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

// ── Assignment type config ─────────────────────────────────────────────────────
const ASSIGN_TYPES = [
  {
    group: "Freight Mode",
    items: [
      { id: "air", label: "Air Freight", desc: "All air freight shipments" },
      { id: "sea", label: "Sea Freight", desc: "All sea freight shipments" },
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
  const [assignType,    setAssignType]    = useState("air");
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

  // Milestones whose due-date basis is "manual" — admin picks a date at assign time.
  const [manualMilestones, setManualMilestones] = useState([]); // [{ key, name }]
  // Per-milestone due-date config keyed by milestone key:
  //   { basis, field, offset, mode:'shared'|'per_shipment', date, perShip:{sid:date} }
  const [mConfig, setMConfig] = useState({});

  // ── Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep("type");
      setAssignType("air");
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
      setMConfig({});
    }
  }, [isOpen]);

  // Load the template's milestones to find any with a "manual" due-date basis.
  useEffect(() => {
    if (!isOpen || !templateId) return;
    fetch(`${BASE}/api/templates/${templateId}`)
      .then(r => r.json())
      .then(res => {
        const tpl = res.data || {};
        const links = [...(tpl.template_milestone_library || [])]
          .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));
        const out = [];
        for (const link of links) {
          const isLocal = link.is_local || !link.milestone_lib_id;
          const cfg = isLocal ? (link.local_config || {}) : (link.milestone_library || {});
          if (cfg && cfg.expected_date_source === "manual") {
            const key = isLocal ? String(cfg.milestone_key || cfg.name || "") : String(link.milestone_lib_id);
            out.push({ key, name: cfg.name || "Milestone" });
          }
        }
        setManualMilestones(out);
      })
      .catch(() => setManualMilestones([]));
  }, [isOpen, templateId]);

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

  // Shipments that will actually receive the template (skipped conflicts won't,
  // so they don't need manual dates).
  const targetShipments = conflictStrategy === "replace"
    ? previewShipments
    : previewShipments.filter(s => !s.has_milestones);

  // Per-milestone config helpers.
  const cfgFor = (key) => mConfig[key] || { basis: "manual", field: "", offset: 0, mode: "shared", date: "", perShip: {} };
  const setCfg = (key, patch) => setMConfig(p => ({ ...p, [key]: { ...cfgFor(key), ...patch } }));
  const setPerShip = (key, sid, v) => {
    const c = cfgFor(key);
    setCfg(key, { perShip: { ...(c.perShip || {}), [sid]: v } });
  };

  // A single manual milestone's config is complete?
  const milestoneComplete = (m) => {
    const c = cfgFor(m.key);
    if (c.basis === "manual") {
      return c.mode === "per_shipment"
        ? targetShipments.every(s => (c.perShip || {})[s.id])
        : !!c.date;
    }
    if (c.basis === "another_field") return !!c.field;
    return true; // days_after_creation / after_previous_milestone need only an offset
  };

  // Every manual milestone must be fully configured before assigning.
  const datesComplete = () =>
    manualMilestones.length === 0 || manualMilestones.every(milestoneComplete);

  // Build the manual_due_dates payload the backend expects.
  const buildManualPayload = () => {
    const out = {};
    for (const m of manualMilestones) {
      const c = cfgFor(m.key);
      if (c.basis === "manual") {
        out[m.key] = c.mode === "per_shipment"
          ? { basis: "manual", per_shipment: c.perShip || {} }
          : { basis: "manual", date: c.date };
      } else {
        out[m.key] = { basis: c.basis, field: c.field || null, offset: Number(c.offset) || 0 };
      }
    }
    return out;
  };

  // After conflicts are handled (or if there are none), collect manual dates
  // when the template has any manual milestones — otherwise assign directly.
  const proceedAfterConflicts = () => {
    if (manualMilestones.length > 0) { setError(null); setStep("dates"); }
    else handleAssign();
  };

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
          // Per-milestone: { key: { basis, date|per_shipment|field+offset } }.
          manual_due_dates:  buildManualPayload(),
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

          {/* Conflicts are resolved in a dedicated next step so they can't be missed */}
          {conflictCount > 0 && (
            <div style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}`, borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span style={{ color: T.amber, flexShrink: 0, paddingTop: "1px" }}><IcoWarn /></span>
              <div style={{ fontSize: "12px", color: "#B45309", lineHeight: "1.5" }}>
                <strong style={{ color: "#92400E" }}>{conflictCount} shipment{conflictCount !== 1 ? "s" : ""} already have milestones.</strong>{" "}
                On the next step you'll choose whether to keep or replace them — nothing is assigned until you confirm.
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
                      color: T.amber, background: T.amberBg, border: `1px solid ${T.amberBorder}`,
                    }}>
                      Has milestones
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

        </div>

        {/* Error strip — sits above the footer so it's always visible */}
        {error && (
          <div style={{ flexShrink: 0, fontSize: "12px", color: T.red, margin: "0 24px 12px", padding: "10px 14px", background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: "8px" }}>
            {error}
          </div>
        )}

        <ModalFooter>
          <button
            onClick={() => setStep(assignType === "custom" ? "custom" : "type")}
            style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50) }}
          >
            ← Back
          </button>
          <button
            onClick={() => { conflictCount > 0 ? setStep("conflict") : proceedAfterConflicts(); }}
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
              : conflictCount > 0
              ? `Next: Handle ${conflictCount} Conflict${conflictCount !== 1 ? "s" : ""} →`
              : manualMilestones.length > 0
              ? "Next: Set Due Dates →"
              : `Assign to ${previewShipments.length} Shipment${previewShipments.length !== 1 ? "s" : ""}`}
          </button>
        </ModalFooter>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  STEP 3b — Resolve Conflicts (dedicated, unmissable step)
  // ══════════════════════════════════════════════════════════════
  if (step === "conflict") {
    const replacing = conflictStrategy === "replace";
    return (
      <div style={OVERLAY}>
        <div style={{ ...baseCard, width: "520px" }}>
          <ModalHeader
            title="Handle Existing Milestones"
            subtitle={`${conflictCount} of ${previewShipments.length} selected shipment${previewShipments.length !== 1 ? "s" : ""} already have milestones`}
            onClose={onClose}
          />

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            <div style={{ fontSize: "13px", color: T.gray600, marginBottom: "16px", lineHeight: "1.6" }}>
              Choose what happens to the shipments that already have milestones. This must be set before assigning.
            </div>

            {/* Big radio cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { val: "skip",    label: "Skip these shipments",   desc: "Keep their existing milestones unchanged. Only shipments without milestones get the new template." },
                { val: "replace", label: "Replace their milestones", desc: "Delete the existing milestones on these shipments and assign the new template. This cannot be undone." },
              ].map(opt => {
                const sel = conflictStrategy === opt.val;
                const danger = opt.val === "replace";
                const accent = danger ? T.red : T.blue;
                return (
                  <div key={opt.val} onClick={() => { setConflictStrategy(opt.val); setError(null); }}
                    style={{
                      display: "flex", gap: "12px", padding: "14px",
                      border: `1.5px solid ${sel ? accent : T.gray200}`,
                      borderRadius: "10px",
                      background: sel ? (danger ? T.redBg : T.blueBg) : T.cardBg,
                      cursor: "pointer", transition: "all 0.13s",
                    }}
                  >
                    <div style={{
                      width: "18px", height: "18px", borderRadius: "50%", marginTop: "1px",
                      border: `2px solid ${sel ? accent : T.gray300}`,
                      background: sel ? accent : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {sel && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fff" }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: sel ? accent : T.gray900 }}>{opt.label}</div>
                      <div style={{ fontSize: "12px", color: T.gray500, marginTop: "3px", lineHeight: "1.5" }}>{opt.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Outcome summary */}
            <div style={{ marginTop: "16px", padding: "12px 14px", background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: "8px", fontSize: "12px", color: T.gray600, lineHeight: "1.6" }}>
              <strong style={{ color: T.gray900 }}>Result: </strong>
              {replacing
                ? `${previewShipments.length} shipment(s) will get the template — ${conflictCount} replaced, ${previewShipments.length - conflictCount} new.`
                : `${previewShipments.length - conflictCount} shipment(s) will get the template, ${conflictCount} skipped.`}
            </div>

            {manualMilestones.length > 0 && (
              <div style={{ marginTop: "16px", fontSize: "11px", color: T.gray500, lineHeight: "1.5" }}>
                This template has manual-date milestone{manualMilestones.length !== 1 ? "s" : ""} — you'll set {manualMilestones.length !== 1 ? "their" : "its"} due date{manualMilestones.length !== 1 ? "s" : ""} on the next step.
              </div>
            )}
          </div>

          {error && (
            <div style={{ flexShrink: 0, fontSize: "12px", color: T.red, margin: "0 24px 12px", padding: "10px 14px", background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: "8px" }}>
              {error}
            </div>
          )}

          <ModalFooter>
            <button onClick={() => { setError(null); setStep("preview"); }} style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50) }}>← Back</button>
            <button
              onClick={proceedAfterConflicts}
              disabled={assigning}
              style={{
                ...solidBtn(replacing ? T.red : T.blue, "#fff"),
                padding: "9px 20px",
                opacity: assigning ? 0.7 : 1,
                cursor: assigning ? "not-allowed" : "pointer",
              }}
            >
              {assigning
                ? "Assigning..."
                : manualMilestones.length > 0
                ? "Next: Set Due Dates →"
                : replacing
                ? `Replace & Assign (${previewShipments.length})`
                : `Skip Conflicts & Assign (${previewShipments.length - conflictCount})`}
            </button>
          </ModalFooter>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  STEP 3c — Set Manual Due Dates (required, always shown when any exist)
  // ══════════════════════════════════════════════════════════════
  if (step === "dates") {
    const complete = datesComplete();
    const dateInp = { fontSize: "12px", padding: "6px 8px", border: `1px solid ${T.gray300}`, borderRadius: "6px", fontFamily: T.font, color: T.gray900, background: T.cardBg };
    const numInp  = { ...dateInp, width: "70px" };
    const selInp  = { fontSize: "12px", padding: "6px 8px", border: `1px solid ${T.gray300}`, borderRadius: "6px", fontFamily: T.font, color: T.gray900, background: T.cardBg };

    return (
      <div style={OVERLAY}>
        <div style={{ ...baseCard, width: "760px", maxWidth: "96vw", height: "82vh", maxHeight: "90vh" }}>
          <ModalHeader
            title="Set Due Dates"
            subtitle={`Choose how each manual milestone's deadline is set for the ${targetShipments.length} shipment${targetShipments.length !== 1 ? "s" : ""} being assigned`}
            onClose={onClose}
          />

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {manualMilestones.map(m => {
                const c = cfgFor(m.key);
                const ok = milestoneComplete(m);
                return (
                  <div key={m.key} style={{ border: `1px solid ${ok ? T.gray200 : T.amberBorder}`, borderRadius: "10px", padding: "12px 14px", background: ok ? T.cardBg : T.amberBg }}>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: T.gray900, marginBottom: "8px" }}>
                      {m.name} {!ok && <span style={{ color: T.red }}>*</span>}
                    </div>

                    {/* Basis selector */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "11px", color: T.gray500 }}>Due date basis</span>
                      <select value={c.basis} onChange={e => setCfg(m.key, { basis: e.target.value })} style={selInp}>
                        {DUE_BASES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                      </select>
                    </div>

                    {/* Specific date */}
                    {c.basis === "manual" && (
                      <div>
                        <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                          {[
                            { val: "shared",       label: "Same for all" },
                            { val: "per_shipment", label: "Per shipment" },
                          ].map(opt => {
                            const sel = (c.mode || "shared") === opt.val;
                            return (
                              <button key={opt.val} type="button" onClick={() => setCfg(m.key, { mode: opt.val })}
                                style={{ fontSize: "11px", fontWeight: "600", padding: "4px 10px", borderRadius: "6px", cursor: "pointer",
                                  border: `1px solid ${sel ? T.blue : T.gray200}`, background: sel ? T.blueBg : T.cardBg, color: sel ? T.blue : T.gray600 }}>
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                        {(c.mode || "shared") === "shared" ? (
                          <input type="date" value={c.date || ""} onChange={e => setCfg(m.key, { date: e.target.value })} style={dateInp} />
                        ) : targetShipments.length === 0 ? (
                          <div style={{ fontSize: "11px", color: T.gray400 }}>No shipments will receive the template.</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {targetShipments.map(s => (
                              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                                <span style={{ fontSize: "11px", color: T.gray600, fontFamily: T.mono }}>{s.job_number ?? s.id.slice(0, 8)}</span>
                                <input type="date" value={(c.perShip || {})[s.id] || ""} onChange={e => setPerShip(m.key, s.id, e.target.value)} style={dateInp} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* From a date field */}
                    {c.basis === "another_field" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <FieldSelector value={c.field || ""} onChange={key => setCfg(m.key, { field: key })} placeholder="Select a date field…" filter="date" size="sm" />
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input type="number" value={c.offset ?? 0} onChange={e => setCfg(m.key, { offset: parseInt(e.target.value) || 0 })} style={numInp} />
                          <span style={{ fontSize: "11px", color: T.gray500 }}>days after that field (0 = on that date, negative = before)</span>
                        </div>
                      </div>
                    )}

                    {/* Days after creation */}
                    {c.basis === "days_after_creation" && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input type="number" min="0" value={c.offset ?? 0} onChange={e => setCfg(m.key, { offset: parseInt(e.target.value) || 0 })} style={numInp} />
                        <span style={{ fontSize: "11px", color: T.gray500 }}>days after the shipment is created</span>
                      </div>
                    )}

                    {/* After previous milestone */}
                    {c.basis === "after_previous_milestone" && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input type="number" min="0" value={c.offset ?? 0} onChange={e => setCfg(m.key, { offset: parseInt(e.target.value) || 0 })} style={numInp} />
                        <span style={{ fontSize: "11px", color: T.gray500 }}>days after the previous milestone completes (resolved per shipment)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!complete && (
              <div style={{ marginTop: "14px", fontSize: "11px", color: T.amber, display: "flex", alignItems: "center", gap: "6px" }}>
                <IcoWarn /> Finish configuring every manual milestone before you can assign.
              </div>
            )}
          </div>

          {error && (
            <div style={{ flexShrink: 0, fontSize: "12px", color: T.red, margin: "0 24px 12px", padding: "10px 14px", background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: "8px" }}>
              {error}
            </div>
          )}

          <ModalFooter>
            <button onClick={() => { setError(null); setStep(conflictCount > 0 ? "conflict" : "preview"); }} style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50) }}>← Back</button>
            <button
              onClick={handleAssign}
              disabled={assigning || !complete}
              style={{
                ...solidBtn(complete ? T.blue : T.gray300, "#fff"),
                padding: "9px 20px",
                opacity: assigning ? 0.7 : 1,
                cursor: complete && !assigning ? "pointer" : "not-allowed",
              }}
            >
              {assigning ? "Assigning..." : `Assign to ${previewShipments.length} Shipment${previewShipments.length !== 1 ? "s" : ""}`}
            </button>
          </ModalFooter>
        </div>
      </div>
    );
  }

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