"use client";

// =============================================================
//  Milestone Library — list page
//  Route: /admin/milestone_library
//
//  Central, searchable list of reusable milestone definitions.
//  Each milestone can be edited, duplicated, or deleted.
// =============================================================

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T, solidBtn, outlineBtn } from "@/styles/tokens";
import { getFieldLabel } from "@/components/milestones/MilestoneBuilder/FieldSelector";

const API = "http://127.0.0.1:5000";

// ── auth header helper (matches the rest of the app) ──────────────
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

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

function trackedFieldOf(m) {
  if (m.milestone_type === "comparison") return getFieldLabel(m.field_a);
  if (m.milestone_type === "document")   return getFieldLabel(m.tracking_field);
  return getFieldLabel(m.primary_field);
}

export default function MilestoneLibraryPage() {
  const router = useRouter();
  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState("");
  const [typeFil,   setTypeFil]   = useState("all");
  const [critFil,   setCritFil]   = useState("all");
  const [busyId,    setBusyId]    = useState(null);

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/milestone-library`, { headers: authHeaders() })
      .then(r => r.json().then(j => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || "Failed to load milestones");
        setItems(j.data ?? []);
        setError(null);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDuplicate = async (id) => {
    setBusyId(id);
    try {
      const res = await fetch(`${API}/api/milestone-library/${id}/duplicate`, { method: "POST", headers: authHeaders() });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Duplicate failed");
      load();
    } catch (e) { alert(e.message); } finally { setBusyId(null); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone if unused.`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`${API}/api/milestone-library/${id}`, { method: "DELETE", headers: authHeaders() });
      const j = await res.json();
      if (res.status === 409) { alert(j.error || "In use by templates — cannot delete."); return; }
      if (!res.ok) throw new Error(j.error || "Delete failed");
      setItems(prev => prev.filter(m => m.id !== id));
    } catch (e) { alert(e.message); } finally { setBusyId(null); }
  };

  const data = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(m => {
      const matchQ = !q || (m.name || "").toLowerCase().includes(q) || trackedFieldOf(m).toLowerCase().includes(q);
      const matchType = typeFil === "all" || m.milestone_type === typeFil;
      const matchCrit = critFil === "all" || (critFil === "critical" ? m.is_critical : !m.is_critical);
      return matchQ && matchType && matchCrit;
    });
  }, [items, search, typeFil, critFil]);

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: T.font }}>
      <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "800", color: T.gray900, margin: 0, letterSpacing: "-0.02em" }}>
              Milestone Library
            </h1>
            <p style={{ marginTop: "4px", fontSize: "13px", color: T.gray500 }}>
              Reusable milestone definitions with their alert rules. Build once, use across many templates.
            </p>
          </div>
          <Link href="/admin/milestone_library/create"
            style={{ ...solidBtn(T.blue, "#fff"), padding: "10px 16px", textDecoration: "none" }}>
            <PlusIcon /> New Milestone
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "20px" }}>
          {[
            { label: "Total", value: items.length },
            { label: "Date Checks", value: items.filter(m => m.milestone_type === "date").length },
            { label: "Comparisons", value: items.filter(m => m.milestone_type === "comparison").length },
            { label: "Critical", value: items.filter(m => m.is_critical).length },
          ].map(s => (
            <div key={s.label} style={{ background: T.cardBg, border: T.cardBorder, borderRadius: "12px", padding: "16px 18px" }}>
              <p style={{ fontSize: "11px", fontWeight: "600", color: T.gray500, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: "26px", fontWeight: "800", color: T.gray900, margin: "4px 0 0" }}>{loading ? "…" : s.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "18px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder="Search by name or field…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: "1 1 260px", background: T.cardBg, border: `1px solid ${T.gray200}`, borderRadius: "9px", padding: "9px 13px", fontSize: "13px", color: T.gray900, outline: "none", fontFamily: T.font }}
          />
          <select value={typeFil} onChange={e => setTypeFil(e.target.value)}
            style={{ background: T.cardBg, border: `1px solid ${T.gray200}`, borderRadius: "9px", padding: "9px 12px", fontSize: "13px", color: T.gray700, fontFamily: T.font, cursor: "pointer" }}>
            <option value="all">All types</option>
            <option value="date">Date Check</option>
            <option value="missing">Missing Info</option>
            <option value="comparison">Field Comparison</option>
            <option value="document">Document Check</option>
          </select>
          <select value={critFil} onChange={e => setCritFil(e.target.value)}
            style={{ background: T.cardBg, border: `1px solid ${T.gray200}`, borderRadius: "9px", padding: "9px 12px", fontSize: "13px", color: T.gray700, fontFamily: T.font, cursor: "pointer" }}>
            <option value="all">All priorities</option>
            <option value="critical">Critical only</option>
            <option value="standard">Standard only</option>
          </select>
        </div>

        {/* Body */}
        {error && (
          <div style={{ padding: "14px 16px", background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: "10px", color: T.red, fontSize: "13px", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: T.gray500, fontSize: "13px" }}>Loading milestones…</p>
        ) : data.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", border: `1.5px dashed ${T.gray200}`, borderRadius: "12px", background: T.cardBg }}>
            <p style={{ fontSize: "14px", fontWeight: "600", color: T.gray700, margin: "0 0 6px" }}>No milestones found</p>
            <p style={{ fontSize: "13px", color: T.gray400, margin: "0 0 16px" }}>
              {items.length === 0 ? "Create your first reusable milestone to get started." : "No milestones match the current filters."}
            </p>
            {items.length === 0 && (
              <Link href="/admin/milestone_library/create" style={{ ...solidBtn(T.blue, "#fff"), padding: "9px 16px", textDecoration: "none" }}>
                <PlusIcon /> New Milestone
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
            {data.map(m => {
              const meta = TYPE_META[m.milestone_type] || TYPE_META.date;
              const ruleCount = (m.milestone_alert_rules || []).length;
              return (
                <div key={m.id}
                  style={{ background: T.cardBg, border: T.cardBorder, borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px", opacity: busyId === m.id ? 0.6 : 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "15px", fontWeight: "700", color: T.gray900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {m.name}
                      </div>
                      <div style={{ fontFamily: T.mono, fontSize: "11px", color: T.gray400, marginTop: "2px" }}>
                        {trackedFieldOf(m) || "—"}
                      </div>
                    </div>
                    {m.is_critical && (
                      <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "99px", background: T.redBg, color: T.red, border: `1px solid ${T.redBorder}`, whiteSpace: "nowrap" }}>
                        CRITICAL
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 9px", borderRadius: "99px", background: meta.bg, color: meta.color }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: "600", padding: "3px 9px", borderRadius: "99px", background: T.gray100, color: T.gray600 }}>
                      {ruleCount} alert rule{ruleCount === 1 ? "" : "s"}
                    </span>
                    {m.is_system_default && (
                      <span style={{ fontSize: "11px", fontWeight: "600", padding: "3px 9px", borderRadius: "99px", background: T.blueBg, color: T.blue }}>
                        System default
                      </span>
                    )}
                  </div>

                  {m.description && (
                    <p style={{ fontSize: "12px", color: T.gray500, margin: 0, lineHeight: "1.5", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {m.description}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: "8px", marginTop: "auto", paddingTop: "6px", borderTop: `1px solid ${T.gray100}` }}>
                    <button onClick={() => router.push(`/admin/milestone_library/${m.id}`)}
                      style={{ ...outlineBtn(T.blue, T.blueBorder, T.blueBg), padding: "6px 12px", fontSize: "12px" }}>
                      Edit
                    </button>
                    <button onClick={() => handleDuplicate(m.id)} disabled={busyId === m.id}
                      style={{ ...outlineBtn(T.gray600, T.gray200, T.gray50), padding: "6px 12px", fontSize: "12px" }}>
                      Duplicate
                    </button>
                    <button onClick={() => handleDelete(m.id, m.name)} disabled={busyId === m.id}
                      style={{ ...outlineBtn(T.red, T.redBorder, T.redBg), padding: "6px 12px", fontSize: "12px", marginLeft: "auto" }}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
