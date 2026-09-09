"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const badge = "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border";

const BASE = "http://127.0.0.1:5000";

// Where a shipment row should link — its milestones page for this role area.
const shipmentHref = (shipmentPath, id) => `${shipmentPath}?id=${id}`;

function TemplateRow({ t, basePath, shipmentPath }) {
  const router = useRouter();
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [ships,    setShips]    = useState(null); // null = not loaded yet
  const [error,    setError]    = useState(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && ships === null) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${BASE}/api/templates/${t.id}/shipments`);
        const j   = await res.json();
        if (!res.ok) throw new Error(j.error || "Failed to load shipments");
        setShips(j.data || []);
      } catch (e) {
        setError(e.message);
        setShips([]);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors group">
        {/* Name */}
        <td className="px-5 py-4"><span className="font-medium text-gray-900">{t.name}</span></td>

        {/* ID */}
        <td className="px-5 py-4">
          <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">{t.id}</span>
        </td>

        {/* Created by */}
        <td className="px-5 py-4 text-gray-600">{t.createdBy}</td>

        {/* Derived from */}
        <td className="px-5 py-4">
          {t.parentTemplate ? (
            <span className={`${badge} text-indigo-700 bg-indigo-50 border-indigo-200`}>{t.parentTemplate.name}</span>
          ) : (
            <span className={`${badge} text-emerald-700 bg-emerald-50 border-emerald-200`}>Original</span>
          )}
        </td>

        {/* Milestones */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min((t.milestoneCount / 20) * 100, 100)}%` }} />
            </div>
            <span className="text-gray-700 font-medium tabular-nums">{t.milestoneCount}</span>
          </div>
        </td>

        {/* Shipment type */}
        <td className="px-5 py-4">
          <span className={`${badge} ${t.shipmentType === "Air Freight" ? "text-sky-700 bg-sky-50 border-sky-200" : "text-teal-700 bg-teal-50 border-teal-200"}`}>
            {t.shipmentType}
          </span>
        </td>

        {/* Used by — dropdown toggle */}
        <td className="px-5 py-4">
          <button
            onClick={toggle}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              open ? "text-blue-700 bg-blue-50 border-blue-200" : "text-gray-600 bg-white border-gray-200 hover:bg-gray-50"
            }`}
            title="Show shipments using this template"
          >
            Shipments
            {ships !== null && <span className="tabular-nums text-gray-400">({ships.length})</span>}
            <ChevronIcon open={open} />
          </button>
        </td>

        {/* Date */}
        <td className="px-5 py-4 text-gray-500 text-xs tabular-nums whitespace-nowrap">{formatDate(t.createdAt)}</td>

        {/* Actions */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link href={`${basePath}?id=${t.id}`} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View">
              <EyeIcon />
            </Link>
            <Link href={`${basePath}?id=${t.id}&edit=true`} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit">
              <EditIcon />
            </Link>
          </div>
        </td>
      </tr>

      {/* Expanded shipments row */}
      {open && (
        <tr className="bg-gray-50/60">
          <td colSpan={9} className="px-5 py-3">
            {loading ? (
              <div className="text-xs text-gray-400 py-2">Loading shipments…</div>
            ) : error ? (
              <div className="text-xs text-red-500 py-2">{error}</div>
            ) : (ships && ships.length === 0) ? (
              <div className="text-xs text-gray-400 py-2">Not assigned to any shipments yet.</div>
            ) : (
              <div className="flex flex-wrap gap-2 py-1">
                {(ships || []).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => router.push(shipmentHref(shipmentPath, s.id))}
                    className="text-left px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 transition-colors"
                    title="Open shipment milestones"
                  >
                    <div className="font-mono text-xs font-semibold text-gray-900">{s.job_number ?? s.id.slice(0, 8)}</div>
                    <div className="text-[11px] text-gray-500">{s.consignee_name ?? "—"}</div>
                  </button>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function TemplatesTable({
  data = [],
  totalCount = 0,
  basePath = "/admin/milestone_template",
  shipmentPath = "/admin/shipment_milestones",
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {["Template", "Template ID", "Created By", "Derived From", "Milestones", "Shipment Type", "Used By", "Created", ""].map((h) => (
              <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-400">
                No templates match your filters.
              </td>
            </tr>
          ) : (
            data.map((t) => (
              <TemplateRow key={t.id} t={t} basePath={basePath} shipmentPath={shipmentPath} />
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
  );
}
