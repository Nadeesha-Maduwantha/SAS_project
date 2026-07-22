"use client";

// =============================================================
//  FieldDefinitionsManager
//  Admin-editable meanings for shipment data fields. Lives in
//  System Settings -> Milestone settings. The meanings show up in
//  the milestone builder's FieldSelector as each field's hint.
// =============================================================

import { useState, useEffect, useMemo } from "react";
import { Check, Search } from "lucide-react";
import { FIELD_CATEGORIES, FIELD_MAP } from "@/components/milestones/MilestoneBuilder/FieldSelector";
import { T, solidBtn } from "@/styles/tokens";

const API = "http://localhost:5000";
function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function FieldDefinitionsManager() {
  const [saved,   setSaved]   = useState({});   // api_field -> definition (persisted)
  const [drafts,  setDrafts]  = useState({});   // api_field -> definition (editing)
  const [search,  setSearch]  = useState("");
  const [savingK, setSavingK] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    fetch(`${API}/api/field-definitions`, { headers: authHeaders() })
      .then(r => r.json().then(j => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || "Failed to load definitions");
        const map = {};
        (j.data ?? []).forEach(row => { if (row.definition) map[row.api_field] = row.definition; });
        setSaved(map);
        setDrafts(map);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Known fields grouped, plus any defined field not in the known list.
  const groups = useMemo(() => {
    const known = new Set();
    const g = FIELD_CATEGORIES.map(cat => {
      const fields = cat.fields.map(f => { known.add(f.key); return { key: f.key, label: f.label, builtin: f.hint }; });
      return { category: cat.category, fields };
    });
    const extras = Object.keys(saved).filter(k => !known.has(k)).map(k => ({ key: k, label: k, builtin: "" }));
    if (extras.length) g.push({ category: "Custom / future fields", fields: extras });
    return g;
  }, [saved]);

  const save = async (key) => {
    setSavingK(key); setError(null);
    try {
      const res = await fetch(`${API}/api/field-definitions`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ api_field: key, label: FIELD_MAP[key]?.label || null, definition: drafts[key] || "" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      setSaved(p => ({ ...p, [key]: drafts[key] || "" }));
    } catch (e) { setError(e.message); }
    finally { setSavingK(null); }
  };

  const q = search.trim().toLowerCase();
  const inp = { flex: 1, background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: "8px", padding: "8px 11px", fontSize: "13px", color: T.gray900, outline: "none", fontFamily: T.font };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: "8px", padding: "8px 12px", marginBottom: "14px" }}>
        <Search size={14} color={T.gray400} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search fields…"
          style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", color: T.gray900, flex: 1, fontFamily: T.font }} />
      </div>

      {error && <div style={{ padding: "9px 12px", background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: "8px", color: T.red, fontSize: "12.5px", marginBottom: "12px" }}>{error}</div>}

      {loading ? (
        <p style={{ fontSize: "13px", color: T.gray500 }}>Loading…</p>
      ) : (
        groups.map(group => {
          const rows = group.fields.filter(f => !q || f.key.toLowerCase().includes(q) || f.label.toLowerCase().includes(q));
          if (rows.length === 0) return null;
          return (
            <div key={group.category} style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: T.gray400, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>{group.category}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {rows.map(f => {
                  const dirty = (drafts[f.key] || "") !== (saved[f.key] || "");
                  return (
                    <div key={f.key} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "190px", flexShrink: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: T.gray900 }}>{f.label}</div>
                        <div style={{ fontFamily: T.mono, fontSize: "10px", color: T.gray400 }}>{f.key}</div>
                      </div>
                      <input
                        value={drafts[f.key] ?? ""}
                        onChange={e => setDrafts(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.builtin || "Describe what this field means…"}
                        style={inp}
                      />
                      <button onClick={() => save(f.key)} disabled={!dirty || savingK === f.key}
                        style={{ ...solidBtn(dirty ? T.blue : T.gray300, "#fff"), padding: "7px 13px", fontSize: "12px", cursor: dirty ? "pointer" : "default", opacity: savingK === f.key ? 0.7 : 1 }}>
                        {savingK === f.key ? "…" : dirty ? "Save" : <Check size={13} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
