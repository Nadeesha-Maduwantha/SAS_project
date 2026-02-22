"use client";

import Link from "next/link";

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

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

// All badges share this base — rounded-md so every badge looks the same shape
const badge = "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border";

export default function TemplatesTable({
  data = [],
  totalCount = 0,
  onDuplicate,
  basePath = "/admin/milestone_template",
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {["Template", "Template ID", "Created By", "Derived From", "Milestones", "Shipment Type", "Created", ""].map((h) => (
              <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {h}
              </th>
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

                {/* Name */}
                <td className="px-5 py-4">
                  <span className="font-medium text-gray-900">{t.name}</span>
                </td>

                {/* ID */}
                <td className="px-5 py-4">
                  <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                    {t.id}
                  </span>
                </td>

                {/* Created by */}
                <td className="px-5 py-4 text-gray-600">{t.createdBy}</td>

                {/* Derived from */}
                <td className="px-5 py-4">
                  {t.parentTemplate ? (
                    <span className={`${badge} text-indigo-700 bg-indigo-50 border-indigo-200`}>
                      {t.parentTemplate.name}
                    </span>
                  ) : (
                    <span className={`${badge} text-emerald-700 bg-emerald-50 border-emerald-200`}>
                      Original
                    </span>
                  )}
                </td>

                {/* Milestones */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${Math.min((t.milestoneCount / 20) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-gray-700 font-medium tabular-nums">{t.milestoneCount}</span>
                  </div>
                </td>

                {/* Shipment type */}
                <td className="px-5 py-4">
                  <span className={`${badge} ${
                    t.shipmentType === "Air Freight"
                      ? "text-sky-700 bg-sky-50 border-sky-200"
                      : "text-teal-700 bg-teal-50 border-teal-200"
                  }`}>
                    {t.shipmentType}
                  </span>
                </td>

                {/* Date */}
                <td className="px-5 py-4 text-gray-500 text-xs tabular-nums whitespace-nowrap">
                  {formatDate(t.createdAt)}
                </td>

                {/* Actions */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`${basePath}/${t.id}`} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View">
                      <EyeIcon />
                    </Link>
                    <Link href={`${basePath}/${t.id}/edit`} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit">
                      <EditIcon />
                    </Link>
                    {onDuplicate && (
                      <button onClick={() => onDuplicate(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors" title="Duplicate">
                        <CopyIcon />
                      </button>
                    )}
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
  );
}