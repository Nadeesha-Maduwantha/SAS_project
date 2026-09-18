"use client";

// =============================================================
//  System Settings — /admin/system_settings
//
//  Grouped into sections; each setting is a collapsible accordion
//  (name shown first, click to expand the full controls).
// =============================================================

import { useState, useEffect } from "react";
import { Settings, MapPin, Check, BookOpen, ChevronDown, AlertTriangle, Mail, Users, UserPlus } from "lucide-react";
import { T, solidBtn, outlineBtn } from "@/styles/tokens";
import FieldDefinitionsManager from "@/components/settings/FieldDefinitionsManager";
import UserTypeRulesManager from "@/components/settings/UserTypeRulesManager";
import UserTypesManager from "@/components/settings/UserTypesManager";
import { humanizeError } from "@/lib/humanizeError";

const API = "http://127.0.0.1:5000";

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// ── Collapsible setting ───────────────────────────────────────────────────────
function Accordion({ icon, title, subtitle, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: T.cardBg, border: T.cardBorder, borderRadius: "12px", overflow: "hidden", marginBottom: "12px" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer", fontFamily: T.font, textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          {icon}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: T.gray900 }}>{title}</div>
            {subtitle && <div style={{ fontSize: "12px", color: T.gray500, marginTop: "2px" }}>{subtitle}</div>}
          </div>
        </div>
        <ChevronDown size={18} color={T.gray400} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }} />
      </button>
      {open && <div style={{ padding: "0 20px 20px" }}>{children}</div>}
    </div>
  );
}

export default function SystemSettingsPage() {
  const [admins,   setAdmins]   = useState([]);
  const [email,    setEmail]    = useState("");
  const [alertOn,  setAlertOn]  = useState(true);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState(null);

  // Field Watch (separate module) — its own recipient
  const [fwEmail,  setFwEmail]  = useState("");
  const [fwOn,     setFwOn]     = useState(true);
  const [fwSaving, setFwSaving] = useState(false);
  const [fwSaved,  setFwSaved]  = useState(false);

  // New user alerts — who gets emailed when a new user account is created
  const [nuEmail,  setNuEmail]  = useState("");
  const [nuOn,     setNuOn]     = useState(true);
  const [nuSaving, setNuSaving] = useState(false);
  const [nuSaved,  setNuSaved]  = useState(false);

  const [testing,    setTesting]    = useState(null);   // 'mismatch' | 'field_watch' | 'new_user'
  const [testResult, setTestResult] = useState(null);   // { target, sent, recipients, errors, reason }

  // What is actually persisted in the DB right now (independent of the edit box).
  const [savedEmail,   setSavedEmail]   = useState(null);
  const [savedFwEmail, setSavedFwEmail] = useState(null);
  const [savedNuEmail, setSavedNuEmail] = useState(null);

  // Cover Access department policy — how far the "no department" exception
  // reaches (services/cover_access.py). Applies to Sales and Operation both.
  const [coverPolicy,      setCoverPolicy]      = useState("any_department");
  const [coverOptions,     setCoverOptions]     = useState([]);
  const [savedCoverPolicy, setSavedCoverPolicy] = useState(null);
  const [coverLoading,     setCoverLoading]     = useState(true);
  const [coverSaving,      setCoverSaving]      = useState(false);
  const [coverSaved,       setCoverSaved]       = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/system-settings/milestone-mismatch`, { headers: authHeaders() }).then(r => r.json().then(j => ({ ok: r.ok, j }))),
      fetch(`${API}/api/system-settings/field-watch`, { headers: authHeaders() }).then(r => r.json().then(j => ({ ok: r.ok, j }))),
      fetch(`${API}/api/system-settings/cover-department-policy`, { headers: authHeaders() }).then(r => r.json().then(j => ({ ok: r.ok, j }))),
      fetch(`${API}/api/system-settings/new-user-alert`, { headers: authHeaders() }).then(r => r.json().then(j => ({ ok: r.ok, j }))),
    ])
      .then(([m, f, c, u]) => {
        if (!m.ok) throw new Error(m.j.error || "Failed to load settings");
        setAdmins(m.j.admins ?? []);
        setEmail(m.j.mismatch_alert_email ?? "");
        setSavedEmail(m.j.mismatch_alert_email ?? null);
        setAlertOn(m.j.alert_on_validation !== false);
        if (f.ok) {
          setFwEmail(f.j.field_watch_alert_email ?? "");
          setSavedFwEmail(f.j.field_watch_alert_email ?? null);
          setFwOn(f.j.field_watch_alert_on !== false);
        }
        if (c.ok) {
          setCoverOptions(c.j.options ?? []);
          setCoverPolicy(c.j.cover_department_policy ?? "any_department");
          setSavedCoverPolicy(c.j.cover_department_policy ?? null);
        }
        if (u.ok) {
          setNuEmail(u.j.new_user_alert_email ?? "");
          setSavedNuEmail(u.j.new_user_alert_email ?? null);
          setNuOn(u.j.new_user_alert_on !== false);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => { setLoading(false); setCoverLoading(false); });
  }, []);

  const saveFieldWatch = async () => {
    setFwSaving(true); setFwSaved(false); setError(null);
    try {
      const res = await fetch(`${API}/api/system-settings/field-watch`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ admin_email: fwEmail || null, alert_on: fwOn }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      setSavedFwEmail(j.field_watch_alert_email ?? (fwEmail || null));
      setFwSaved(true);
      setTimeout(() => setFwSaved(false), 2500);
    } catch (e) { setError(e.message); }
    finally { setFwSaving(false); }
  };

  const saveNewUserAlert = async () => {
    setNuSaving(true); setNuSaved(false); setError(null);
    try {
      const res = await fetch(`${API}/api/system-settings/new-user-alert`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ admin_email: nuEmail || null, alert_on: nuOn }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      setSavedNuEmail(j.new_user_alert_email ?? (nuEmail || null));
      setNuSaved(true);
      setTimeout(() => setNuSaved(false), 2500);
    } catch (e) { setError(e.message); }
    finally { setNuSaving(false); }
  };

  const saveCoverPolicy = async () => {
    setCoverSaving(true); setCoverSaved(false); setError(null);
    try {
      const res = await fetch(`${API}/api/system-settings/cover-department-policy`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ cover_department_policy: coverPolicy }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      setSavedCoverPolicy(j.cover_department_policy ?? coverPolicy);
      setCoverSaved(true);
      setTimeout(() => setCoverSaved(false), 2500);
    } catch (e) { setError(e.message); }
    finally { setCoverSaving(false); }
  };

  const save = async () => {
    setSaving(true); setSaved(false); setError(null);
    try {
      const res = await fetch(`${API}/api/system-settings/milestone-mismatch`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ admin_email: email || null, alert_on_validation: alertOn }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      setSavedEmail(j.mismatch_alert_email ?? (email || null));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  // Run the REAL detector for this stream and email the actual digest to the
  // saved recipient — a genuine end-to-end test, not a canned sample.
  //   mismatch    → POST /api/field-map/detect   (emails all current mismatches)
  //   field_watch → GET  /api/field-watch/scan   (emails new delayed/renamed fields)
  const runNow = async (target) => {
    setTesting(target); setTestResult(null); setError(null);
    try {
      let res;
      if (target === "field_watch") {
        res = await fetch(`${API}/api/field-watch/scan`, { headers: authHeaders() });
      } else if (target === "new_user") {
        res = await fetch(`${API}/api/system-settings/test-email`, {
          method: "POST", headers: authHeaders(), body: JSON.stringify({ target: "new_user" }),
        });
      } else {
        res = await fetch(`${API}/api/field-map/detect`, { method: "POST", headers: authHeaders() });
      }
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Run failed");
      if (target === "field_watch") {
        const r = j.result || {};
        setTestResult({ target, sent: r.emailed ?? 0, count: r.field_alerts ?? 0 });
      } else if (target === "new_user") {
        setTestResult({ target, sent: j.sent ?? 0, recipients: j.recipients || [], reason: j.reason, errors: j.errors });
      } else {
        const n = j.notified || {};
        setTestResult({ target, sent: n.sent ?? 0, count: j.count ?? 0, recipients: n.recipients || [], reason: n.reason, errors: n.errors });
      }
    } catch (e) { setError(e.message); }
    finally { setTesting(null); }
  };

  // Inline result under whichever section was run.
  const TestResult = ({ target }) => {
    if (!testResult || testResult.target !== target) return null;
    const { sent, count, recipients, reason, errors } = testResult;
    const ok = sent > 0;
    const who = recipients && recipients.length ? recipients.join(", ") : `${sent} recipient(s)`;
    const msg = target === "new_user"
      ? (ok ? `Test email sent to ${who}.` : `No email sent (${reason || (errors && errors[0]?.error) || "check recipient / SMTP"}).`)
      : ok
        ? `Found ${count} — emailed ${who}.`
        : count > 0
          ? `Found ${count} — no email sent (${reason || (errors && errors[0]?.error) || "check recipient / SMTP"}).`
          : "No current issues found — nothing to email.";
    return (
      <div style={{ marginTop: "10px", fontSize: "12.5px", fontWeight: "600", color: ok ? T.green : (count > 0 ? T.red : T.gray500), display: "flex", alignItems: "center", gap: "6px" }}>
        {ok ? <Check size={14} /> : <AlertTriangle size={14} />} {msg}
      </div>
    );
  };

  const lbl = { display: "block", fontSize: "12px", fontWeight: "600", color: T.gray600, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" };
  const inp = { width: "100%", background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: T.gray900, outline: "none", fontFamily: T.font, boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: T.font }}>
      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "30px 24px" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <Settings size={22} color={T.gray700} />
          <h1 style={{ fontSize: "23px", fontWeight: "800", color: T.gray900, margin: 0, letterSpacing: "-0.02em" }}>System Settings</h1>
        </div>
        <p style={{ fontSize: "13px", color: T.gray500, margin: "0 0 22px" }}>Configure how the SAS system behaves.</p>

        {/* ── Milestone settings section ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <MapPin size={16} color={T.blue} />
          <h2 style={{ fontSize: "15px", fontWeight: "700", color: T.gray900, margin: 0 }}>Milestone settings</h2>
        </div>

        {/* Setting 1 — Milestone name mismatch */}
        <Accordion
          icon={<MapPin size={16} color={T.blue} />}
          title="Milestone name mismatch"
          subtitle="Who gets emailed when an expected field isn't in the feed"
        >
          <p style={{ fontSize: "12.5px", color: T.gray500, margin: "0 0 18px", lineHeight: "1.6" }}>
            When a milestone expects a CargoWise field the feed doesn't provide (a naming mismatch), the system
            emails the chosen admin so they can map the real field on the Field Registry page.
          </p>

          {error && (
            <div title={error} style={{ padding: "10px 13px", background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: "8px", color: T.red, fontSize: "13px", marginBottom: "16px" }}>{humanizeError(error)}</div>
          )}

          {loading ? (
            <p style={{ fontSize: "13px", color: T.gray500 }}>Loading…</p>
          ) : (
            <>
              <div style={{ marginBottom: "18px" }}>
                <label style={lbl}>Alerting admin account</label>
                <select value={email} onChange={e => setEmail(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                  <option value="">— Select an admin —</option>
                  {admins.map(a => (
                    <option key={a.id} value={a.email}>
                      {(a.full_name || "Unnamed") + " · " + a.email}
                    </option>
                  ))}
                </select>
                {admins.length === 0 && (
                  <p style={{ fontSize: "11px", color: T.amber, marginTop: "6px" }}>No admin accounts found. You can still type an email below.</p>
                )}
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="or type an email address…"
                  style={{ ...inp, marginTop: "8px" }} />
                <div style={{ marginTop: "8px", fontSize: "12px", color: savedEmail ? T.green : T.amber }}>
                  {savedEmail
                    ? <>Currently saved — auto-alerts go to <strong>{savedEmail}</strong>.</>
                    : <>Not saved yet — auto-alerts fall back to the general admin list. Pick an admin and click Save.</>}
                  {email !== (savedEmail ?? "") && <span style={{ color: T.gray400 }}> (unsaved changes)</span>}
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "22px" }}
                onClick={() => setAlertOn(v => !v)}>
                <div style={{ width: "38px", height: "22px", borderRadius: "99px", background: alertOn ? T.green : T.gray300, position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#fff", position: "absolute", top: "3px", left: alertOn ? "19px" : "3px", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </div>
                <span style={{ fontSize: "13px", color: T.gray700 }}>Send mismatch alert emails</span>
              </label>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button onClick={save} disabled={saving} style={{ ...solidBtn(T.blue, "#fff"), padding: "10px 22px", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => runNow("mismatch")} disabled={testing === "mismatch"} style={{ ...outlineBtn(T.blue, T.blueBorder, T.blueBg), padding: "10px 16px" }}>
                  <Mail size={14} /> {testing === "mismatch" ? "Running…" : "Run check & email now"}
                </button>
                {saved && <span style={{ display: "flex", alignItems: "center", gap: "5px", color: T.green, fontSize: "13px", fontWeight: "600" }}><Check size={15} /> Saved</span>}
              </div>
              <TestResult target="mismatch" />
            </>
          )}
        </Accordion>

        {/* Setting 2 — Field definitions */}
        <Accordion
          icon={<BookOpen size={16} color={T.blue} />}
          title="Field definitions"
          subtitle="Plain-language meaning for each data field"
        >
          <p style={{ fontSize: "12.5px", color: T.gray500, margin: "0 0 18px", lineHeight: "1.6" }}>
            Give each data field a plain-language meaning. These definitions appear in the milestone builder,
            so anyone creating a milestone or template knows exactly what a field represents.
          </p>
          <FieldDefinitionsManager />
        </Accordion>

        {/* Setting 3 — Field Watch (separate module: delayed / possibly-renamed data fields) */}
        <Accordion
          icon={<AlertTriangle size={16} color={T.amber} />}
          title="Data field alerts (Field Watch)"
          subtitle="Who is emailed when an expected data field is delayed / possibly renamed"
        >
          <p style={{ fontSize: "12.5px", color: T.gray500, margin: "0 0 18px", lineHeight: "1.6" }}>
            The Field Watch module is separate from milestone alerting. When an expected CargoWise field
            hasn&apos;t arrived — and the milestone is overdue or a later milestone&apos;s data already came —
            it emails this admin to check whether the data arrived under a different name.
          </p>
          {loading ? (
            <p style={{ fontSize: "13px", color: T.gray500 }}>Loading…</p>
          ) : (
            <>
              <div style={{ marginBottom: "18px" }}>
                <label style={lbl}>Alerting admin account</label>
                <select value={fwEmail} onChange={e => setFwEmail(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                  <option value="">— Select an admin —</option>
                  {admins.map(a => (
                    <option key={a.id} value={a.email}>{(a.full_name || "Unnamed") + " · " + a.email}</option>
                  ))}
                </select>
                <input value={fwEmail} onChange={e => setFwEmail(e.target.value)} placeholder="or type an email address…"
                  style={{ ...inp, marginTop: "8px" }} />
                <div style={{ marginTop: "8px", fontSize: "12px", color: savedFwEmail ? T.green : T.amber }}>
                  {savedFwEmail
                    ? <>Currently saved — alerts go to <strong>{savedFwEmail}</strong>.</>
                    : <>Not saved yet — pick an admin and click Save.</>}
                  {fwEmail !== (savedFwEmail ?? "") && <span style={{ color: T.gray400 }}> (unsaved changes)</span>}
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "22px" }}
                onClick={() => setFwOn(v => !v)}>
                <div style={{ width: "38px", height: "22px", borderRadius: "99px", background: fwOn ? T.green : T.gray300, position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#fff", position: "absolute", top: "3px", left: fwOn ? "19px" : "3px", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </div>
                <span style={{ fontSize: "13px", color: T.gray700 }}>Send field-watch alert emails</span>
              </label>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button onClick={saveFieldWatch} disabled={fwSaving} style={{ ...solidBtn(T.blue, "#fff"), padding: "10px 22px", opacity: fwSaving ? 0.7 : 1 }}>
                  {fwSaving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => runNow("field_watch")} disabled={testing === "field_watch"} style={{ ...outlineBtn(T.blue, T.blueBorder, T.blueBg), padding: "10px 16px" }}>
                  <Mail size={14} /> {testing === "field_watch" ? "Running…" : "Run scan & email now"}
                </button>
                {fwSaved && <span style={{ display: "flex", alignItems: "center", gap: "5px", color: T.green, fontSize: "13px", fontWeight: "600" }}><Check size={15} /> Saved</span>}
              </div>
              <TestResult target="field_watch" />
            </>
          )}
        </Accordion>

        {/* ── User account alerts section ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", marginTop: "22px" }}>
          <UserPlus size={16} color={T.blue} />
          <h2 style={{ fontSize: "15px", fontWeight: "700", color: T.gray900, margin: 0 }}>User account alerts</h2>
        </div>

        <Accordion
          icon={<UserPlus size={16} color={T.blue} />}
          title="New user account created"
          subtitle="Who is emailed (and shown in the bell) when a new user account is created"
        >
          <p style={{ fontSize: "12.5px", color: T.gray500, margin: "0 0 18px", lineHeight: "1.6" }}>
            Whenever a new user account is created — through Create User or a Super User creating a Sales,
            Operation, or custom-type account — this admin gets an email, and it also appears in the top-bar
            &quot;Security Notifications&quot; bell for every admin (that part is controlled separately, under
            Security Settings → Security Notifications).
          </p>
          {loading ? (
            <p style={{ fontSize: "13px", color: T.gray500 }}>Loading…</p>
          ) : (
            <>
              <div style={{ marginBottom: "18px" }}>
                <label style={lbl}>Alerting admin account</label>
                <select value={nuEmail} onChange={e => setNuEmail(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                  <option value="">— Select an admin —</option>
                  {admins.map(a => (
                    <option key={a.id} value={a.email}>{(a.full_name || "Unnamed") + " · " + a.email}</option>
                  ))}
                </select>
                <input value={nuEmail} onChange={e => setNuEmail(e.target.value)} placeholder="or type an email address…"
                  style={{ ...inp, marginTop: "8px" }} />
                <div style={{ marginTop: "8px", fontSize: "12px", color: savedNuEmail ? T.green : T.amber }}>
                  {savedNuEmail
                    ? <>Currently saved — alerts go to <strong>{savedNuEmail}</strong>.</>
                    : <>Not saved yet — auto-alerts fall back to the general admin list. Pick an admin and click Save.</>}
                  {nuEmail !== (savedNuEmail ?? "") && <span style={{ color: T.gray400 }}> (unsaved changes)</span>}
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "22px" }}
                onClick={() => setNuOn(v => !v)}>
                <div style={{ width: "38px", height: "22px", borderRadius: "99px", background: nuOn ? T.green : T.gray300, position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#fff", position: "absolute", top: "3px", left: nuOn ? "19px" : "3px", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </div>
                <span style={{ fontSize: "13px", color: T.gray700 }}>Send new-user alert emails</span>
              </label>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button onClick={saveNewUserAlert} disabled={nuSaving} style={{ ...solidBtn(T.blue, "#fff"), padding: "10px 22px", opacity: nuSaving ? 0.7 : 1 }}>
                  {nuSaving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => runNow("new_user")} disabled={testing === "new_user"} style={{ ...outlineBtn(T.blue, T.blueBorder, T.blueBg), padding: "10px 16px" }}>
                  <Mail size={14} /> {testing === "new_user" ? "Sending…" : "Send test email"}
                </button>
                {nuSaved && <span style={{ display: "flex", alignItems: "center", gap: "5px", color: T.green, fontSize: "13px", fontWeight: "600" }}><Check size={15} /> Saved</span>}
              </div>
              <TestResult target="new_user" />
            </>
          )}
        </Accordion>

        {/* ── Cover Access section ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", marginTop: "22px" }}>
          <Users size={16} color={T.blue} />
          <h2 style={{ fontSize: "15px", fontWeight: "700", color: T.gray900, margin: 0 }}>Cover Access settings</h2>
        </div>

        {/* Setting 4 — Cover Access department policy (Sales + Operation both) */}
        <Accordion
          icon={<Users size={16} color={T.blue} />}
          title="Department policy"
          subtitle="How covering a colleague with no department on file is allowed"
        >
          <p style={{ fontSize: "12.5px", color: T.gray500, margin: "0 0 18px", lineHeight: "1.6" }}>
            Normally a colleague can only request to cover someone in the same department (Sea or Air) and
            the same role. When a user has no department on file, this setting controls how far that
            exception reaches — it applies the same way to Sales users and Operation users.
          </p>

          {coverLoading ? (
            <p style={{ fontSize: "13px", color: T.gray500 }}>Loading…</p>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
                {coverOptions.map(opt => (
                  <label
                    key={opt.value}
                    onClick={() => setCoverPolicy(opt.value)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer",
                      padding: "10px 12px", borderRadius: "8px",
                      background: coverPolicy === opt.value ? T.blueBg : T.gray50,
                      border: `1px solid ${coverPolicy === opt.value ? T.blueBorder : T.gray200}`,
                    }}
                  >
                    <input type="radio" checked={coverPolicy === opt.value} onChange={() => setCoverPolicy(opt.value)} style={{ marginTop: "3px" }} />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: T.gray900 }}>{opt.label}</div>
                      <div style={{ fontSize: "12px", color: T.gray500, marginTop: "2px", lineHeight: "1.5" }}>{opt.description}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ marginBottom: "18px", fontSize: "12px", color: savedCoverPolicy ? T.green : T.amber }}>
                {savedCoverPolicy
                  ? <>Currently saved — <strong>{coverOptions.find(o => o.value === savedCoverPolicy)?.label || savedCoverPolicy}</strong>.</>
                  : <>Not saved yet — pick an option and click Save.</>}
                {coverPolicy !== (savedCoverPolicy ?? "") && <span style={{ color: T.gray400 }}> (unsaved changes)</span>}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button onClick={saveCoverPolicy} disabled={coverSaving} style={{ ...solidBtn(T.blue, "#fff"), padding: "10px 22px", opacity: coverSaving ? 0.7 : 1 }}>
                  {coverSaving ? "Saving…" : "Save"}
                </button>
                {coverSaved && <span style={{ display: "flex", alignItems: "center", gap: "5px", color: T.green, fontSize: "13px", fontWeight: "600" }}><Check size={15} /> Saved</span>}
              </div>
            </>
          )}
        </Accordion>

        {/* ── User Type Rules section ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", marginTop: "22px" }}>
          <Users size={16} color={T.blue} />
          <h2 style={{ fontSize: "15px", fontWeight: "700", color: T.gray900, margin: 0 }}>User Type Rules</h2>
        </div>

        <Accordion
          icon={<Users size={16} color={T.blue} />}
          title="Identification rules & suggested accounts"
          subtitle="How the system tells a Sales User from an Operation User from shipment data"
        >
          <UserTypeRulesManager />
        </Accordion>

        {/* ── User Types section ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", marginTop: "22px" }}>
          <Users size={16} color={T.blue} />
          <h2 style={{ fontSize: "15px", fontWeight: "700", color: T.gray900, margin: 0 }}>User Types</h2>
        </div>

        <Accordion
          icon={<Users size={16} color={T.blue} />}
          title="Custom user types"
          subtitle="Define a new type of user beyond Admin/Super User/Sales User/Operation User"
        >
          <UserTypesManager />
        </Accordion>

        {/* Field registry — same component/table as "Field definitions" above,
            shown again right here so a field can be registered (or routed
            between Milestones / User management / None) without leaving this
            part of the page while setting up a custom type. */}
        <Accordion
          icon={<BookOpen size={16} color={T.blue} />}
          title="Field registry"
          subtitle="Every registered field, and where new ones go — Milestones or User management"
        >
          <p style={{ fontSize: "12.5px", color: T.gray500, margin: "0 0 18px", lineHeight: "1.6" }}>
            When a new field shows up in the shipments feed (e.g. a jsonb column CargoWise starts sending),
            register it below and decide what it's for: flag its Usage as "Milestones" to make it available in
            the milestone builder's field picker, or "User management" to make it selectable as a custom user
            type's visibility field above.
          </p>
          <FieldDefinitionsManager />
        </Accordion>
      </div>
    </div>
  );
}
