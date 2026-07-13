"use client";

// =============================================================
//  TemplateMilestoneBuilder.jsx
//  Path: components/milestones/TemplateMilestoneBuilder.jsx
//
//  Replaces the old name-only MilestoneSequenceEdit inside the
//  template create/edit flow. Each milestone slot is either:
//    - picked from the milestone library (source: 'library'), or
//    - built new with the full 4-step builder (source: 'local').
//
//  Props:
//    slots     — array of slot objects, see shapes below
//    onChange  — (newSlots) => void
//
//  Slot shapes:
//    library: { key, source:'library', milestone_lib_id, meta:{name,milestone_type,is_critical,rule_count} }
//    local:   { key, source:'local',   local_config:{...builder object...} }
// =============================================================

import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, Pencil, X, Plus } from "lucide-react";
import { T, solidBtn, outlineBtn, ghostBtn } from "@/styles/tokens";
import MilestoneBuilderShell from "@/components/milestones/MilestoneBuilder/MilestoneBuilderShell";
import { getFieldLabel } from "@/components/milestones/MilestoneBuilder/FieldSelector";

const API = "http://localhost:5000";

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const TYPE_META = {
  date:       { label: "Date Check",       color: T.blue,  bg: T.blueBg  },
  missing:    { label: "Missing Info",     color: T.amber, bg: T.amberBg },
  comparison: { label: "Field Comparison", color: T.gray700, bg: T.gray100 },
  document:   { label: "Document Check",   color: T.green, bg: T.greenBg },
};

const newKey = () => `slot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// Derive display info from any slot (library or local).
function slotDisplay(slot) {
  if (slot.source === "library") {
    const m = slot.meta || {};
    return {
      name: m.name || "Library milestone",
      type: m.milestone_type,
      critical: m.is_critical,
      ruleCount: m.rule_count ?? 0,
      field: m.tracked_field || "",
    };
  }
  const c = slot.local_config || {};
  const field =
    c.milestone_type === "comparison" ? getFieldLabel(c.field_a)
    : c.milestone_type === "document" ? getFieldLabel(c.tracking_field)
    : getFieldLabel(c.primary_field);
  return {
    name: c.name || "New milestone",
    type: c.milestone_type,
    critical: c.is_critical,
    ruleCount: (c.alert_rules || []).length,
    field,
  };
}

// ── Full-screen overlay used for both the picker and the builder ──────────────
function Overlay({ children, onClose, wide }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(17,24,39,0.5)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }}
    >
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: "16px", width: wide ? "860px" : "560px", maxWidth: "96vw", boxShadow: "0 24px 70px rgba(0,0,0,0.22)" }}>
        {children}
      </div>
    </div>
  );
}

// ── Library picker ─────────────────────────────────────────────────────────────
function LibraryPicker({ onPick, onClose, alreadyPicked }) {
  const [items, setItems]   = useState([]);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState(null);
  const [q, setQ]           = useState("");

  useEffect(() => {
    fetch(`${API}/api/milestone-library`, { headers: authHeaders() })
      .then(r => r.json().then(j => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (!ok) throw new Error(j.error || "Failed to load library"); setItems(j.data ?? []); })
      .catch(e => setError(e.message))
      .finally(() => setLoad(false));
  }, []);

  const filtered = items.filter(m => {
    const s = q.trim().toLowerCase();
    return !s || (m.name || "").toLowerCase().includes(s);
  });

  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: "22px 24px", borderBottom: `1px solid ${T.gray200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "16px", fontWeight: "800", color: T.gray900 }}>Pick from Library</div>
          <div style={{ fontSize: "12px", color: T.gray500, marginTop: "2px" }}>Add an existing milestone (with its alert rules) to this template.</div>
        </div>
        <button onClick={onClose} style={{ ...ghostBtn, color: T.gray400 }}><X size={16} /></button>
      </div>
      <div style={{ padding: "16px 24px" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search milestones…"
          style={{ width: "100%", background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: "9px", padding: "9px 13px", fontSize: "13px", outline: "none", fontFamily: T.font, boxSizing: "border-box", marginBottom: "14px" }} />

        {loading ? <p style={{ color: T.gray500, fontSize: "13px" }}>Loading…</p>
          : error ? <p style={{ color: T.red, fontSize: "13px" }}>{error}</p>
          : filtered.length === 0 ? <p style={{ color: T.gray400, fontSize: "13px" }}>No library milestones found. Build one instead.</p>
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "50vh", overflowY: "auto" }}>
              {filtered.map(m => {
                const meta = TYPE_META[m.milestone_type] || TYPE_META.date;
                const rc = (m.milestone_alert_rules || []).length;
                const picked = alreadyPicked.includes(m.id);
                const tracked = m.milestone_type === "comparison" ? getFieldLabel(m.field_a)
                  : m.milestone_type === "document" ? getFieldLabel(m.tracking_field)
                  : getFieldLabel(m.primary_field);
                return (
                  <button key={m.id} type="button" disabled={picked}
                    onClick={() => onPick({
                      key: newKey(), source: "library", milestone_lib_id: m.id,
                      meta: { name: m.name, milestone_type: m.milestone_type, is_critical: m.is_critical, rule_count: rc, tracked_field: tracked },
                    })}
                    style={{ textAlign: "left", padding: "12px 14px", borderRadius: "10px", border: `1px solid ${T.gray200}`, background: picked ? T.gray50 : "#fff", cursor: picked ? "not-allowed" : "pointer", opacity: picked ? 0.55 : 1, fontFamily: T.font }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "14px", fontWeight: "700", color: T.gray900 }}>{m.name}</span>
                      {picked && <span style={{ fontSize: "11px", color: T.gray400 }}>Added</span>}
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "99px", background: meta.bg, color: meta.color }}>{meta.label}</span>
                      <span style={{ fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "99px", background: T.gray100, color: T.gray600 }}>{rc} rule{rc === 1 ? "" : "s"}</span>
                      {m.is_critical && <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "99px", background: T.redBg, color: T.red }}>Critical</span>}
                      {tracked && <span style={{ fontFamily: T.mono, fontSize: "11px", color: T.gray400, alignSelf: "center" }}>{tracked}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
      </div>
    </Overlay>
  );
}

// ── Build-new wrapper (hosts the 4-step builder) ──────────────────────────────
function BuildNew({ initial, onDone, onClose }) {
  const [alsoLibrary, setAlsoLibrary] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (milestone) => {
    if (alsoLibrary) {
      // Save to library first, then add as a library-linked slot.
      setSaving(true);
      try {
        const res = await fetch(`${API}/api/milestone-library`, { method: "POST", headers: authHeaders(), body: JSON.stringify(milestone) });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Failed to save to library");
        const m = j.data;
        const rc = (m.milestone_alert_rules || []).length;
        const tracked = m.milestone_type === "comparison" ? getFieldLabel(m.field_a)
          : m.milestone_type === "document" ? getFieldLabel(m.tracking_field)
          : getFieldLabel(m.primary_field);
        onDone({ key: newKey(), source: "library", milestone_lib_id: m.id,
          meta: { name: m.name, milestone_type: m.milestone_type, is_critical: m.is_critical, rule_count: rc, tracked_field: tracked } });
      } catch (e) { alert(e.message); setSaving(false); }
      return;
    }
    // Template-local milestone — kept in local_config.
    onDone({ key: newKey(), source: "local", local_config: milestone });
  };

  return (
    <Overlay onClose={onClose} wide>
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.gray200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "16px", fontWeight: "800", color: T.gray900 }}>Build Milestone</div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: T.gray600, cursor: "pointer" }}>
          <input type="checkbox" checked={alsoLibrary} onChange={e => setAlsoLibrary(e.target.checked)} />
          Also save to library
        </label>
      </div>
      <div style={{ padding: "20px 24px" }}>
        <MilestoneBuilderShell initialData={initial} onSave={handleSave} onCancel={onClose} saving={saving} />
      </div>
    </Overlay>
  );
}

// ── Slot card ──────────────────────────────────────────────────────────────────
function SlotCard({ slot, index, total, onMove, onEdit, onRemove }) {
  const d = slotDisplay(slot);
  const meta = TYPE_META[d.type] || TYPE_META.date;
  return (
    <div style={{ background: "#fff", border: `1px solid ${T.gray200}`, borderRadius: "10px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px" }}>
      <span style={{ fontFamily: T.mono, fontSize: "11px", fontWeight: "700", color: T.blue, background: T.blueBg, border: `1px solid ${T.blueBorder}`, padding: "2px 7px", borderRadius: "5px", flexShrink: 0 }}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", fontWeight: "700", color: T.gray900 }}>{d.name}</span>
          <span style={{ fontSize: "10px", fontWeight: "700", padding: "1px 7px", borderRadius: "99px", background: meta.bg, color: meta.color }}>{meta.label}</span>
          <span style={{ fontSize: "10px", fontWeight: "700", padding: "1px 7px", borderRadius: "99px", background: slot.source === "library" ? T.blueBg : T.gray100, color: slot.source === "library" ? T.blue : T.gray600 }}>
            {slot.source === "library" ? "LIBRARY" : "TEMPLATE-ONLY"}
          </span>
          {d.critical && <span style={{ fontSize: "10px", fontWeight: "700", padding: "1px 7px", borderRadius: "99px", background: T.redBg, color: T.red }}>CRITICAL</span>}
        </div>
        <div style={{ fontSize: "11px", color: T.gray400, marginTop: "3px" }}>
          {d.ruleCount} alert rule{d.ruleCount === 1 ? "" : "s"}{d.field ? ` · ${d.field}` : ""}
        </div>
      </div>
      <div style={{ display: "flex", gap: "4px", flexShrink: 0, alignItems: "center" }}>
        <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} title="Move up"
          style={{ ...ghostBtn, opacity: index === 0 ? 0.3 : 1 }}><ChevronUp size={15} /></button>
        <button type="button" onClick={() => onMove(index, 1)} disabled={index === total - 1} title="Move down"
          style={{ ...ghostBtn, opacity: index === total - 1 ? 0.3 : 1 }}><ChevronDown size={15} /></button>
        {slot.source === "local" && (
          <button type="button" onClick={() => onEdit(index)} title="Edit" style={{ ...ghostBtn, color: T.blue }}><Pencil size={14} /></button>
        )}
        <button type="button" onClick={() => onRemove(index)} title="Remove" style={{ ...ghostBtn, color: T.red }}><X size={15} /></button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TemplateMilestoneBuilder({ slots = [], onChange }) {
  const [showPicker, setShowPicker] = useState(false);
  const [buildState, setBuildState] = useState(null); // null | { index } | {}

  const add = (slot) => { onChange([...slots, slot]); };
  const remove = (i) => onChange(slots.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= slots.length) return;
    const arr = [...slots];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };
  const editLocal = (i) => setBuildState({ index: i });

  const alreadyPicked = slots.filter(s => s.source === "library").map(s => s.milestone_lib_id);

  return (
    <div>
      {slots.length === 0 ? (
        <div style={{ textAlign: "center", padding: "36px 20px", border: `1.5px dashed ${T.gray200}`, borderRadius: "10px", marginBottom: "14px" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: T.gray500, marginBottom: "4px" }}>No milestones yet</div>
          <div style={{ fontSize: "12px", color: T.gray400 }}>Pick from the library or build a new milestone to start the sequence.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
          {slots.map((s, i) => (
            <SlotCard key={s.key} slot={s} index={i} total={slots.length}
              onMove={move} onEdit={editLocal} onRemove={remove} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px" }}>
        <button type="button" onClick={() => setShowPicker(true)}
          style={{ ...outlineBtn(T.blue, T.blueBorder, T.blueBg), flex: 1, justifyContent: "center" }}>
          <Plus size={15} /> Pick from Library
        </button>
        <button type="button" onClick={() => setBuildState({})}
          style={{ ...solidBtn(T.blue, "#fff"), flex: 1, justifyContent: "center", padding: "9px 16px" }}>
          <Plus size={15} /> Build New Milestone
        </button>
      </div>

      {slots.length > 0 && (
        <p style={{ fontSize: "12px", color: T.gray400, marginTop: "10px" }}>
          {slots.length} milestone{slots.length > 1 ? "s" : ""} in this template.
        </p>
      )}

      {showPicker && (
        <LibraryPicker
          alreadyPicked={alreadyPicked}
          onPick={(slot) => { add(slot); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {buildState && (
        <BuildNew
          initial={buildState.index != null ? slots[buildState.index].local_config : null}
          onClose={() => setBuildState(null)}
          onDone={(slot) => {
            if (buildState.index != null) {
              const arr = [...slots];
              arr[buildState.index] = slot;
              onChange(arr);
            } else {
              add(slot);
            }
            setBuildState(null);
          }}
        />
      )}
    </div>
  );
}

// ── Read-only view of a template's milestones (used on the view page) ─────────
export function TemplateMilestoneView({ slots = [], onPromote, promotingKey }) {
  if (slots.length === 0) {
    return <p style={{ fontSize: "13px", color: T.gray400 }}>This template has no milestones yet.</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {slots.map((s, i) => {
        const d = slotDisplay(s);
        const meta = TYPE_META[d.type] || TYPE_META.date;
        return (
          <div key={s.key} style={{ background: "#fff", border: `1px solid ${T.gray200}`, borderRadius: "10px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontFamily: T.mono, fontSize: "11px", fontWeight: "700", color: T.blue, background: T.blueBg, border: `1px solid ${T.blueBorder}`, padding: "2px 7px", borderRadius: "5px", flexShrink: 0 }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "13px", fontWeight: "700", color: T.gray900 }}>{d.name}</span>
                <span style={{ fontSize: "10px", fontWeight: "700", padding: "1px 7px", borderRadius: "99px", background: meta.bg, color: meta.color }}>{meta.label}</span>
                <span style={{ fontSize: "10px", fontWeight: "700", padding: "1px 7px", borderRadius: "99px", background: s.source === "library" ? T.blueBg : T.gray100, color: s.source === "library" ? T.blue : T.gray600 }}>
                  {s.source === "library" ? "LIBRARY" : "TEMPLATE-ONLY"}
                </span>
                {d.critical && <span style={{ fontSize: "10px", fontWeight: "700", padding: "1px 7px", borderRadius: "99px", background: T.redBg, color: T.red }}>CRITICAL</span>}
              </div>
              <div style={{ fontSize: "11px", color: T.gray400, marginTop: "3px" }}>
                {d.ruleCount} alert rule{d.ruleCount === 1 ? "" : "s"}{d.field ? ` · ${d.field}` : ""}
              </div>
            </div>
            {s.source === "local" && onPromote && s.tml_id && (
              <button type="button" onClick={() => onPromote(s)} disabled={promotingKey === s.key}
                style={{ ...outlineBtn(T.blue, T.blueBorder, T.blueBg), padding: "6px 12px", fontSize: "12px", flexShrink: 0 }}>
                {promotingKey === s.key ? "Adding…" : "Add to Library"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Convert slots → API payload for POST/PUT /api/templates
export function slotsToPayload(slots) {
  return slots.map((s, i) => s.source === "library"
    ? { source: "library", milestone_lib_id: s.milestone_lib_id, sequence_order: i }
    : { source: "local", local_config: s.local_config, sequence_order: i });
}

// Convert a template's template_milestone_library rows → slots (for edit page)
export function tmlRowsToSlots(rows = []) {
  return [...rows]
    .sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
    .map(r => {
      if (r.is_local || !r.milestone_lib_id) {
        return { key: r.id || newKey(), source: "local", tml_id: r.id, local_config: r.local_config || {} };
      }
      const m = r.milestone_library || {};
      const tracked = m.milestone_type === "comparison" ? getFieldLabel(m.field_a)
        : m.milestone_type === "document" ? getFieldLabel(m.tracking_field)
        : getFieldLabel(m.primary_field);
      return {
        key: r.id || newKey(),
        source: "library",
        milestone_lib_id: r.milestone_lib_id,
        tml_id: r.id,
        meta: { name: m.name, milestone_type: m.milestone_type, is_critical: m.is_critical, rule_count: (m.milestone_alert_rules || []).length, tracked_field: tracked },
      };
    });
}
