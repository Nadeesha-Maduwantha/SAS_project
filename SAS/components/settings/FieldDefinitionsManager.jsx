"use client";

// =============================================================
//  FieldDefinitionsManager
//  Admin-editable meanings for shipment/milestone data fields.
//  Lives in System Settings -> Milestone settings. The meanings
//  show up in the milestone builder's FieldSelector as each
//  field's hint.
//
//  Also doubles as the shared "field registry" for User Type
//  Rules: each field can be flagged Usage = Milestones / User
//  management / None ("none" = registered but not wired to any
//  feature yet — reserved for a later feature). A field flagged
//  User management becomes selectable as an identification-rule
//  column in System Settings -> User Type Rules, and — when its
//  Value shape is "List of emails" — is matched by JSONB
//  containment instead of an exact match (see
//  services/user_type_rules.py / services/scope.py).
// =============================================================

import { useState, useEffect, useMemo } from "react";
import { Check, Search, Plus } from "lucide-react";
import { FIELD_CATEGORIES, FIELD_MAP } from "@/components/milestones/MilestoneBuilder/FieldSelector";
import { T, solidBtn, outlineBtn } from "@/styles/tokens";

const API = "http://127.0.0.1:5000";
function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const USAGE_LABEL = { none: "None", milestones: "Milestones", user_management: "User management" };
const SHAPE_LABEL = { text: "Text", email: "Single email", jsonb_email_array: "List of emails" };
const emptyMeta = { table_name: "shipments", usage: "none", value_shape: "text" };

export default function FieldDefinitionsManager() {
  const [saved,   setSaved]   = useState({});   // api_field -> definition (persisted)
  const [drafts,  setDrafts]  = useState({});   // api_field -> definition (editing)
  const [meta,    setMeta]    = useState({});   // api_field -> { table_name, usage, value_shape } (persisted)
  const [metaDrafts, setMetaDrafts] = useState({}); // api_field -> same shape (editing)
  const [search,  setSearch]  = useState("");
  const [savingK, setSavingK] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // "register a new field" mini-form
  const [newField, setNewField] = useState("");
  const [newTable, setNewTable] = useState("shipments");
  const [addingField, setAddingField] = useState(false);

  const load = () => {
    setLoading(true); setError(null);
    return fetch(`${API}/api/field-definitions`, { headers: authHeaders() })
      .then(r => r.json().then(j => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || "Failed to load definitions");
        const defMap = {}, metaMap = {};
        (j.data ?? []).forEach(row => {
          if (row.definition) defMap[row.api_field] = row.definition;
          metaMap[row.api_field] = {
            table_name: row.table_name || "shipments",
            usage: row.usage || "none",
            value_shape: row.value_shape || "text",
          };
        });
        setSaved(defMap); setDrafts(defMap);
        setMeta(metaMap); setMetaDrafts(metaMap);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Known fields grouped, plus any defined field not in the known list.
  const groups = useMemo(() => {
    const known = new Set();
    const g = FIELD_CATEGORIES.map(cat => {
      const fields = cat.fields.map(f => { known.add(f.key); return { key: f.key, label: f.label, builtin: f.hint }; });
      return { category: cat.category, fields };
    });
    const extraKeys = new Set([...Object.keys(saved), ...Object.keys(meta)].filter(k => !known.has(k)));
    const extras = [...extraKeys].map(k => ({ key: k, label: k, builtin: "" }));
    if (extras.length) g.push({ category: "Custom / future fields", fields: extras });
    return g;
  }, [saved, meta]);

  const metaFor = (key) => metaDrafts[key] || meta[key] || emptyMeta;
  const setMetaField = (key, patch) => setMetaDrafts(p => ({ ...p, [key]: { ...metaFor(key), ...patch } }));

  const save = async (key) => {
    setSavingK(key); setError(null);
    try {
      const m = metaFor(key);
      const res = await fetch(`${API}/api/field-definitions`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({
          api_field: key, label: FIELD_MAP[key]?.label || null, definition: drafts[key] || "",
          table_name: m.table_name, usage: m.usage, value_shape: m.value_shape,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      setSaved(p => ({ ...p, [key]: drafts[key] || "" }));
      setMeta(p => ({ ...p, [key]: m }));
    } catch (e) { setError(e.message); }
    finally { setSavingK(null); }
  };

  const addField = async () => {
    const key = newField.trim();
    if (!key) return;
    setAddingField(true); setError(null);
    try {
      const res = await fetch(`${API}/api/field-definitions`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ api_field: key, table_name: newTable, usage: "none", value_shape: "text" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Could not register field");
      setNewField("");
      await load();
    } catch (e) { setError(e.message); }
    finally { setAddingField(false); }
  };

  const q = search.trim().toLowerCase();
  const inp = { flex: 1, background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: "8px", padding: "8px 11px", fontSize: "13px", color: T.gray900, outline: "none", fontFamily: T.font };
  const sel = { background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: "8px", padding: "7px 8px", fontSize: "11.5px", color: T.gray900, outline: "none", fontFamily: T.font, cursor: "pointer" };

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
        <>
          {groups.map(group => {
            const rows = group.fields.filter(f => !q || f.key.toLowerCase().includes(q) || f.label.toLowerCase().includes(q));
            if (rows.length === 0) return null;
            return (
              <div key={group.category} style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: T.gray400, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>{group.category}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {rows.map(f => {
                    const m = metaFor(f.key);
                    const savedM = meta[f.key] || emptyMeta;
                    const dirty = (drafts[f.key] || "") !== (saved[f.key] || "")
                      || m.usage !== savedM.usage || m.value_shape !== savedM.value_shape || m.table_name !== savedM.table_name;
                    return (
                      <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: "6px",
                        padding: "8px 10px", background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "190px", flexShrink: 0 }}>
                            <div style={{ fontSize: "13px", fontWeight: "600", color: T.gray900 }}>{f.label}</div>
                            <div style={{ fontFamily: T.mono, fontSize: "10px", color: T.gray400 }}>
                              {m.table_name}.{f.key}
                            </div>
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
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "2px" }}>
                          <span style={{ fontSize: "10.5px", color: T.gray400, textTransform: "uppercase", letterSpacing: "0.04em" }}>Usage</span>
                          <select value={m.usage} onChange={e => setMetaField(f.key, { usage: e.target.value })} style={sel}>
                            {Object.keys(USAGE_LABEL).map(u => <option key={u} value={u}>{USAGE_LABEL[u]}</option>)}
                          </select>
                          {m.usage === "user_management" && (
                            <>
                              <span style={{ fontSize: "10.5px", color: T.gray400, textTransform: "uppercase", letterSpacing: "0.04em", marginLeft: "6px" }}>Value shape</span>
                              <select value={m.value_shape} onChange={e => setMetaField(f.key, { value_shape: e.target.value })} style={sel}>
                                <option value="email">{SHAPE_LABEL.email}</option>
                                <option value="jsonb_email_array">{SHAPE_LABEL.jsonb_email_array}</option>
                              </select>
                              <span style={{ fontSize: "11px", color: T.gray400 }}>
                                selectable in User Type Rules once saved
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ── Register a new field (not yet in the known list) ── */}
          <div style={{ marginTop: "6px", paddingTop: "14px", borderTop: `1px solid ${T.gray200}` }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: T.gray400, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
              Register a new field
            </div>
            <p style={{ fontSize: "12px", color: T.gray500, margin: "0 0 10px", lineHeight: "1.5" }}>
              Not in the list above yet (e.g. a column added for a later feature)? Register it here — it'll
              appear under "Custom / future fields" where you can set its meaning and Usage.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <select value={newTable} onChange={e => setNewTable(e.target.value)} style={{ ...sel, fontSize: "12.5px", padding: "8px 10px" }}>
                <option value="shipments">shipments</option>
                <option value="shipment_milestones">shipment_milestones</option>
              </select>
              <input value={newField} onChange={e => setNewField(e.target.value)} placeholder="column_name…" style={inp} />
              <button onClick={addField} disabled={addingField || !newField.trim()}
                style={{ ...outlineBtn(T.blue, T.blueBorder, T.blueBg), padding: "8px 14px", fontSize: "12.5px", display: "flex", alignItems: "center", gap: "5px", opacity: addingField ? 0.7 : 1 }}>
                <Plus size={13} /> {addingField ? "Adding…" : "Register"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
