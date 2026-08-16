"use client";

// =============================================================
//  Milestone Library — view / edit one milestone
//  Route: /admin/milestone_library/[id]
//
//  Loads a library milestone (with its alert rules) into the
//  4-step MilestoneBuilder for editing. Also shows which
//  templates currently use this milestone.
// =============================================================

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { T, outlineBtn } from "@/styles/tokens";
import MilestoneBuilderShell from "@/components/milestones/MilestoneBuilder/MilestoneBuilderShell";

const API = "http://localhost:5000";

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// Map a DB milestone row (+ nested rules) into the builder's shape.
function toBuilderShape(row) {
  return {
    name:                 row.name || "",
    description:          row.description || "",
    is_critical:          !!row.is_critical,
    milestone_type:       row.milestone_type || "",
    primary_field:        row.primary_field || "",
    expected_date_source: row.expected_date_source || "self",
    expected_date_field:  row.expected_date_field || "",
    expected_date_offset: row.expected_date_offset ?? 0,
    document_name:        row.document_name || "",
    tracking_field:       row.tracking_field || "",
    field_a:              row.field_a || "",
    operator:             row.operator || "",
    field_b:              row.field_b || "",
    fixed_value:          row.fixed_value || "",
    threshold_value:      row.threshold_value ?? "",
    alert_rules:          (row.milestone_alert_rules || []).map(r => ({
      timing:               r.timing ?? "before",
      days_offset:          r.days_offset ?? 1,
      fire_time:            (r.fire_time || "09:00").slice(0, 5),
      condition:            r.condition ?? "always",
      recipient_type:       r.recipient_type ?? "operations",
      custom_email:         r.custom_email ?? "",
      recurrence_type:      r.recurrence_type ?? "once",
      recurrence_interval:  r.recurrence_interval ?? 1,
      recurrence_end_type:  r.recurrence_end_type ?? "after_n_times",
      recurrence_end_n:     r.recurrence_end_n ?? 1,
      recurrence_end_date:  r.recurrence_end_date ?? "",
      stop_condition_field: r.stop_condition_field ?? "",
      stop_condition_type:  r.stop_condition_type ?? "is_not_null",
      stop_condition_value: r.stop_condition_value ?? "",
    })),
  };
}

export default function EditLibraryMilestonePage() {
  const router = useRouter();
  const { id } = useParams();

  const [initial,   setInitial]   = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/milestone-library/${id}`, { headers: authHeaders() }).then(r => r.json().then(j => ({ ok: r.ok, j }))),
      fetch(`${API}/api/milestone-library/${id}/usage`, { headers: authHeaders() }).then(r => r.json().then(j => ({ ok: r.ok, j }))).catch(() => ({ ok: false, j: {} })),
    ])
      .then(([mRes, uRes]) => {
        if (!mRes.ok) throw new Error(mRes.j.error || "Milestone not found");
        setInitial(toBuilderShape(mRes.j.data));
        setTemplates(uRes.ok ? (uRes.j.data ?? []) : []);
        setError(null);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (milestone) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/milestone-library/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(milestone),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to save changes");
      router.push("/admin/milestone_library");
    } catch (e) {
      alert(e.message);
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: T.font }}>
      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "28px 24px" }}>

        <div style={{ marginBottom: "20px" }}>
          <Link href="/admin/milestone_library"
            style={{ fontSize: "12px", color: T.blue, textDecoration: "none", fontWeight: "600" }}>
            ← Milestone Library
          </Link>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: T.gray900, margin: "8px 0 4px", letterSpacing: "-0.02em" }}>
            Edit Milestone
          </h1>
          <p style={{ fontSize: "13px", color: T.gray500, margin: 0 }}>
            Changes apply to future template assignments. Shipments already assigned keep their saved snapshot.
          </p>
        </div>

        {/* Templates using this milestone */}
        {templates.length > 0 && (
          <div style={{ background: T.blueBg, border: `1px solid ${T.blueBorder}`, borderRadius: "10px", padding: "12px 14px", marginBottom: "18px" }}>
            <div style={{ fontSize: "12px", fontWeight: "700", color: T.blue, marginBottom: "6px" }}>
              Used in {templates.length} template{templates.length === 1 ? "" : "s"}
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {templates.map(t => (
                <span key={t.id} style={{ fontSize: "12px", padding: "3px 9px", borderRadius: "99px", background: "#fff", color: T.gray700, border: `1px solid ${T.blueBorder}` }}>
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ color: T.gray500, fontSize: "13px" }}>Loading milestone…</p>
        ) : error ? (
          <div style={{ padding: "14px 16px", background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: "10px", color: T.red, fontSize: "13px" }}>
            {error}
            <div style={{ marginTop: "12px" }}>
              <button onClick={() => router.push("/admin/milestone_library")}
                style={{ ...outlineBtn(T.red, T.redBorder, "#fff"), padding: "6px 12px", fontSize: "12px" }}>
                Back to library
              </button>
            </div>
          </div>
        ) : (
          <MilestoneBuilderShell
            initialData={initial}
            onSave={handleSave}
            onCancel={() => router.push("/admin/milestone_library")}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}
