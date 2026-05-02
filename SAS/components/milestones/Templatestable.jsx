"use client";

import { useState } from "react";
import Link from "next/link";
import { T, solidBtn, outlineBtn, ghostBtn } from "@/styles/tokens";

const BASE = "http://localhost:5000";

// ── Icons ──────────────────────────────────────────────────────────────────────
const EyeIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EditIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const AssignIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
const TrashIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const WarnIcon   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcoX       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

const formatDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const badge = "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border";

// ── Delete Confirmation Modal ──────────────────────────────────────────────────
function DeleteConfirmModal({ template, onConfirm, onClose, deleting }) {
  const [shipments,        setShipments]        = useState(null);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [shipmentError,    setShipmentError]    = useState(null);
  const [showShipments,    setShowShipments]    = useState(false);

  const loadShipments = async () => {
    if (shipments !== null) { setShowShipments(s => !s); return; }
    setLoadingShipments(true);
    setShipmentError(null);
    try {
      const res  = await fetch(`${BASE}/api/templates/${template.id}/shipments`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setShipments(data.data ?? []);
      setShowShipments(true);
    } catch (e) {
      setShipmentError(e.message);
    } finally {
      setLoadingShipments(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(17,24,39,0.45)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: "16px", padding: "28px",
        width: "460px", maxWidth: "94vw",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)", border: "1px solid #E5E7EB",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ color: T.red }}><WarnIcon /></div>
            <span style={{ fontSize: "15px", fontWeight: "700", color: T.gray900 }}>Delete Template</span>
          </div>
          <button onClick={onClose} style={{ ...ghostBtn, color: T.gray400 }}><IcoX /></button>
        </div>

        {/* Warning banner */}
        <div style={{
          background: T.amberBg, border: `1px solid ${T.amberBorder}`,
          borderRadius: "10px", padding: "12px 16px", marginBottom: "16px",
        }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#92400E", marginBottom: "4px" }}>
            This action may affect active shipments
          </div>
          <div style={{ fontSize: "12px", color: "#B45309", lineHeight: "1.6" }}>
            Deleting <strong>{template.name}</strong> will soft-delete it — no new shipments can use it,
            but milestones already assigned to active shipments will remain unchanged.
          </div>
        </div>

        {/* See affected shipments */}
        <button
          onClick={loadShipments}
          disabled={loadingShipments}
          style={{
            fontSize: "12px", fontWeight: "600", color: T.blue,
            background: "none", border: "none", cursor: "pointer",
            padding: "0 0 14px", fontFamily: "inherit",
            textDecoration: "underline", display: "block",
          }}
        >
          {loadingShipments
            ? "Loading..."
            : showShipments
            ? "Hide affected shipments ↑"
            : "See which shipments use this template ↓"}
        </button>

        {shipmentError && (
          <div style={{ fontSize: "12px", color: T.red, marginBottom: "12px" }}>{shipmentError}</div>
        )}

        {showShipments && shipments !== null && (
          <div style={{
            border: `1px solid ${T.gray200}`, borderRadius: "10px",
            overflow: "hidden", marginBottom: "16px",
            maxHeight: "200px", overflowY: "auto",
          }}>
            {shipments.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: T.gray400 }}>
                No active shipments are using this template.
              </div>
            ) : (
              <>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr",
                  padding: "8px 14px", background: T.gray50,
                  borderBottom: `1px solid ${T.gray200}`,
                  fontSize: "10px", fontWeight: "600",
                  color: T.gray500, textTransform: "uppercase", letterSpacing: "0.05em",
                }}>
                  <span>Job Number</span>
                  <span>Consignee</span>
                </div>
                {shipments.map((s, i) => (
                  <div key={s.id} style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr",
                    padding: "9px 14px",
                    borderTop: i > 0 ? `1px solid ${T.gray100}` : "none",
                    fontSize: "12px",
                  }}>
                    <span style={{ fontFamily: "monospace", fontWeight: "600", color: T.blue }}>
                      {s.job_number ?? s.id.slice(0, 8)}
                    </span>
                    <span style={{ color: T.gray700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.consignee_name ?? "—"}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ ...outlineBtn(T.gray500, T.gray200, T.gray50), padding: "9px 18px" }}
            onMouseEnter={e => e.currentTarget.style.background = T.gray100}
            onMouseLeave={e => e.currentTarget.style.background = T.gray50}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              ...solidBtn(T.red, "#fff"), padding: "9px 22px", borderRadius: "8px",
              opacity: deleting ? 0.7 : 1, cursor: deleting ? "not-allowed" : "pointer",
            }}
            onMouseEnter={e => { if (!deleting) e.currentTarget.style.opacity = "0.87"; }}
            onMouseLeave={e => e.currentTarget.style.opacity = deleting ? "0.7" : "1"}
          >
            <TrashIcon /> {deleting ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main table ─────────────────────────────────────────────────────────────────
export default function TemplatesTable({
  data       = [],
  totalCount = 0,
  basePath   = "/admin/milestone_template",
  onAssign   = () => {},
  onDeleted  = () => {},
}) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${BASE}/api/templates/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTarget(null);
        onDeleted(deleteTarget.id);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete template");
      }
    } catch {
      alert("Could not connect to server.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {["Template", "Template ID", "Created By", "Derived From", "Milestones", "Shipment Type", "Created", ""].map((h) => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">
                  No templates match your filters.
                </td>
              </tr>
            ) : (
              data.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors group">

                  <td className="px-5 py-4">
                    <span className="font-medium text-gray-900">{t.name}</span>
                  </td>

                  <td className="px-5 py-4">
                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                      {t.id}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-gray-600">{t.created_by_name  ?? "—"}</td>

                  <td className="px-5 py-4">
                    {t.parentTemplate ? (
                      <span className={`${badge} text-indigo-700 bg-indigo-50 border-indigo-200`}>{t.parentTemplate.name}</span>
                    ) : (
                      <span className={`${badge} text-emerald-700 bg-emerald-50 border-emerald-200`}>Original</span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(((t.template_milestones?.length ?? 0) / 20) * 100, 100)}%` }} />
                      </div>
                      <span className="text-gray-700 font-medium tabular-nums">{(t.template_milestones?.length ?? 0)}</span>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className={`${badge} ${t.shipment_type    ?? "—" === "Air Freight" ? "text-sky-700 bg-sky-50 border-sky-200" : "text-teal-700 bg-teal-50 border-teal-200"}`}>
                      {t.shipment_type    ?? "—"}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-gray-500 text-xs tabular-nums whitespace-nowrap">
                    {formatDate(t.created_at)}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`${basePath}?id=${t.id}`} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View"><EyeIcon /></Link>
                      <Link href={`${basePath}?id=${t.id}&edit=true`} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit"><EditIcon /></Link>
                      <button onClick={() => onAssign(t.id, t.name)} className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors" title="Assign to Shipments"><AssignIcon /></button>
                      <button onClick={() => setDeleteTarget(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete Template"><TrashIcon /></button>
                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>

        {data.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">
              Showing <span className="font-medium text-gray-600">{data.length}</span> of{" "}
              <span className="font-medium text-gray-600">{totalCount}</span> templates
            </p>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          template={deleteTarget}
          deleting={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}