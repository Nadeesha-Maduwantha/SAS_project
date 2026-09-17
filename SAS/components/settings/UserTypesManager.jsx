"use client";

// =============================================================
//  UserTypesManager
//  Admin-defined custom user types — a 5th+ role beyond the fixed
//  4 (Admin, Super User, Sales User, Operation User), which stay
//  hardcoded and unchanged. Lives in System Settings -> User
//  Types. A custom type behaves like Operation/Sales: visibility
//  follows an admin-picked field (reusing the same field registry
//  User Type Rules uses), and admin toggles whether its users can
//  use Cover Access (with each other) and whether they're meant
//  to receive alert emails.
//
//  Once created, a type appears as a Role option on the Create
//  User pages.
// =============================================================

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { T, solidBtn, outlineBtn } from "@/styles/tokens";

const API = "http://127.0.0.1:5000";
function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function slugify(label) {
  return (label || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export default function UserTypesManager() {
  const [types, setTypes] = useState([]);
  const [allowedTables, setAllowedTables] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // new-type draft
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [table, setTable] = useState("");
  const [column, setColumn] = useState("");
  const [canRequestCover, setCanRequestCover] = useState(true);
  const [receiveAlerts, setReceiveAlerts] = useState(false);
  const [canEmailClients, setCanEmailClients] = useState(true);

  // "register a new field" — for when the field a type should be matched on
  // doesn't exist in the registry yet (e.g. a fresh column that just showed
  // up in the shipments jsonb from CargoWise). Same idea as the milestone
  // builder's FieldSelector "Use custom field", and writes to the exact same
  // registry (field_definitions) the Field registry / Field meanings section
  // manages — it shows up there afterwards too.
  const [showRegister, setShowRegister] = useState(false);
  const [regTable, setRegTable] = useState("shipments");
  const [regField, setRegField] = useState("");
  const [regShape, setRegShape] = useState("email");
  const [registering, setRegistering] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [t, at] = await Promise.all([
        fetch(`${API}/api/user-types?include_inactive=1`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/api/user-type-rules/allowed-tables`, { headers: authHeaders() }).then(r => r.json()),
      ]);
      setTypes(t.data || []);
      setAllowedTables(at.data || {});
      setTable(prev => {
        const tables = Object.keys(at.data || {});
        if (prev && tables.includes(prev)) return prev;
        const first = tables[0] || "";
        setColumn(((at.data || {})[first] || [])[0] || "");
        return first;
      });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const key = slugify(label);
  const columnsForTable = allowedTables[table] || [];

  const registerField = async () => {
    const field = regField.trim();
    if (!field) return;
    setRegistering(true); setError(null);
    try {
      const res = await fetch(`${API}/api/field-definitions`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({
          api_field: field, table_name: regTable,
          usage: "user_management", value_shape: regShape,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Could not register field");
      // Use it immediately, then refresh so the picker (and the Field
      // registry section) both show it going forward.
      setTable(regTable);
      setColumn(field);
      setRegField(""); setShowRegister(false);
      await load();
    } catch (e) { setError(e.message); }
    finally { setRegistering(false); }
  };

  const addType = async () => {
    if (!label.trim() || !table || !column) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API}/api/user-types`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          label: label.trim(), description: description.trim() || null,
          field_table: table, field_column: column,
          can_request_cover: canRequestCover, receive_alerts: receiveAlerts,
          can_email_clients: canEmailClients,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Could not create user type");
      setLabel(""); setDescription("");
      load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const toggleField = async (type, field, value) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API}/api/user-types/${type.id}`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not update");
      load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const deactivate = async (type) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API}/api/user-types/${type.id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not deactivate");
      load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const lbl = { display: "block", fontSize: "11px", fontWeight: "600", color: T.gray500, marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.04em" };
  const inp = { width: "100%", background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: "8px", padding: "8px 10px", fontSize: "12.5px", color: T.gray900, outline: "none", fontFamily: T.font, boxSizing: "border-box" };

  if (loading) return <p style={{ fontSize: "13px", color: T.gray500 }}>Loading…</p>;

  return (
    <div>
      {error && <div style={{ padding: "9px 12px", background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: "8px", color: T.red, fontSize: "12.5px", marginBottom: "14px" }}>{error}</div>}

      <p style={{ fontSize: "12px", color: T.gray500, margin: "0 0 14px", lineHeight: "1.6" }}>
        A custom type behaves like Sales/Operation: its users only see the shipments (and milestones) where the
        field below identifies them, and it shows up as a Role option on the Create User pages once saved.
        Admin, Super User, Sales User and Operation User are built in and unaffected by anything here.
      </p>

      {/* ── Existing types ── */}
      {types.length === 0 ? (
        <p style={{ fontSize: "12.5px", color: T.gray400, marginBottom: "16px" }}>No custom user types yet — add one below.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          {types.map(t => (
            <div key={t.id} style={{ padding: "10px 12px", background: t.is_active ? T.cardBg : T.gray50,
              border: `1px solid ${T.gray200}`, borderRadius: "8px", opacity: t.is_active ? 1 : 0.6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: T.gray900 }}>{t.label}</div>
                  <div style={{ fontFamily: T.mono, fontSize: "10.5px", color: T.gray400 }}>
                    role key: {t.key} · sees via {t.field_table}.{t.field_column}
                  </div>
                </div>
                {!t.is_active && <span style={{ fontSize: "10.5px", fontWeight: "700", color: T.gray500 }}>Inactive</span>}
                {t.is_active && (
                  <button onClick={() => deactivate(t)} disabled={busy}
                    title="Deactivate (accounts already using it keep working, but it won't offer as a Role for new ones)"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: T.red, padding: "4px" }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {t.description && <div style={{ fontSize: "11.5px", color: T.gray500, marginBottom: "8px" }}>{t.description}</div>}
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: T.gray700, cursor: t.is_active ? "pointer" : "default" }}>
                  <input type="checkbox" checked={!!t.can_request_cover} disabled={busy || !t.is_active}
                    onChange={e => toggleField(t, "can_request_cover", e.target.checked)} />
                  Can request Cover Access (with other {t.label} users)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: T.gray700, cursor: t.is_active ? "pointer" : "default" }}>
                  <input type="checkbox" checked={!!t.receive_alerts} disabled={busy || !t.is_active}
                    onChange={e => toggleField(t, "receive_alerts", e.target.checked)} />
                  Receive alert emails
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: T.gray700, cursor: t.is_active ? "pointer" : "default" }}>
                  <input type="checkbox" checked={t.can_email_clients !== false} disabled={busy || !t.is_active}
                    onChange={e => toggleField(t, "can_email_clients", e.target.checked)} />
                  Can email clients directly
                </label>
              </div>
              {t.receive_alerts && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", marginTop: "8px",
                  padding: "6px 8px", background: T.amberBg || "#FFFBEB", border: `1px solid ${T.amberBorder || "#FDE68A"}`, borderRadius: "6px" }}>
                  <AlertTriangle size={13} color={T.amber || "#D97706"} style={{ marginTop: "1px", flexShrink: 0 }} />
                  <span style={{ fontSize: "11px", color: T.gray700, lineHeight: "1.5" }}>
                    Not wired to a digest sender yet — this flag is stored for when that's built, but {t.label} users
                    currently won't actually receive an email. They can still see everything on their dashboard.
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Add new type ── */}
      <div style={{ paddingTop: "14px", borderTop: `1px solid ${T.gray200}` }}>
        <div style={{ fontSize: "12px", fontWeight: "700", color: T.gray600, marginBottom: "8px" }}>Add a user type</div>

        <div style={{ marginBottom: "8px" }}>
          <label style={lbl}>Label</label>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Finance User" style={inp} />
          {label.trim() && <div style={{ fontFamily: T.mono, fontSize: "10.5px", color: T.gray400, marginTop: "4px" }}>role key: {key || "…"}</div>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
          <div>
            <label style={lbl}>Sees shipments via — table</label>
            <select value={table} onChange={e => { setTable(e.target.value); setColumn((allowedTables[e.target.value] || [])[0] || ""); }}
              style={{ ...inp, cursor: "pointer" }}>
              {Object.keys(allowedTables).length === 0 && <option value="">No fields flagged for User management yet</option>}
              {Object.keys(allowedTables).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Column</label>
            <select value={column} onChange={e => setColumn(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              {columnsForTable.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {Object.keys(allowedTables).length === 0 && (
          <p style={{ fontSize: "11.5px", color: T.gray500, margin: "0 0 8px", lineHeight: "1.5" }}>
            Flag a field's Usage as "User management" in the Field registry section below first — or register a new
            one right here.
          </p>
        )}

        {!showRegister ? (
          <button type="button" onClick={() => { setRegTable(table || "shipments"); setShowRegister(true); }}
            style={{ background: "none", border: "none", padding: 0, marginBottom: "12px",
              color: T.blue, fontSize: "11.5px", fontWeight: "600", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "4px" }}>
            <Plus size={12} /> Field not listed? Register a new one
          </button>
        ) : (
          <div style={{ marginBottom: "12px", padding: "10px 12px", background: T.gray50,
            border: `1px solid ${T.gray200}`, borderRadius: "8px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: T.gray600, marginBottom: "8px" }}>
              Register a new field
            </div>
            <p style={{ fontSize: "11.5px", color: T.gray500, margin: "0 0 10px", lineHeight: "1.5" }}>
              For a column that isn't in the picker yet — e.g. one that just showed up in the shipments feed.
              This is the same registry the Field registry section below manages, so it'll appear there too.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
              <div>
                <label style={lbl}>Table</label>
                <select value={regTable} onChange={e => setRegTable(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                  <option value="shipments">shipments</option>
                  <option value="shipment_milestones">shipment_milestones</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Value shape</label>
                <select value={regShape} onChange={e => setRegShape(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                  <option value="email">Single email</option>
                  <option value="jsonb_email_array">List of emails (jsonb)</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={lbl}>Column / field name</label>
              <input value={regField} onChange={e => setRegField(e.target.value)} placeholder="e.g. assigned_emails" style={inp} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={registerField} disabled={registering || !regField.trim()}
                style={{ ...solidBtn(T.blue, "#fff"), padding: "7px 14px", fontSize: "12px",
                  display: "flex", alignItems: "center", gap: "5px", opacity: registering ? 0.7 : 1 }}>
                <Plus size={12} /> {registering ? "Registering…" : "Register & use"}
              </button>
              <button type="button" onClick={() => { setShowRegister(false); setRegField(""); }}
                style={{ ...outlineBtn(T.gray400, T.gray200, T.gray50), padding: "7px 14px", fontSize: "12px" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{ marginBottom: "10px" }}>
          <label style={lbl}>Description (optional)</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What this type is for…" style={inp} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: T.gray700, cursor: "pointer" }}>
            <input type="checkbox" checked={canRequestCover} onChange={e => setCanRequestCover(e.target.checked)} />
            Can request Cover Access
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: T.gray700, cursor: "pointer" }}>
            <input type="checkbox" checked={receiveAlerts} onChange={e => setReceiveAlerts(e.target.checked)} />
            Receive alert emails
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: T.gray700, cursor: "pointer" }}>
            <input type="checkbox" checked={canEmailClients} onChange={e => setCanEmailClients(e.target.checked)} />
            Can email clients directly
          </label>
        </div>

        <button onClick={addType} disabled={busy || !label.trim() || !table || !column}
          style={{ ...solidBtn(T.blue, "#fff"), padding: "8px 16px", fontSize: "12.5px", display: "flex", alignItems: "center", gap: "5px", opacity: busy ? 0.7 : 1 }}>
          <Plus size={13} /> Add user type
        </button>
      </div>
    </div>
  );
}
