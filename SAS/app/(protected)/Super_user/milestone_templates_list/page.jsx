"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import FilterDropdown from "@/components/milestones/FilterDropdown";
import TemplatesTable from "@/components/milestones/Templatestable";
import AssignTemplateModal from "@/components/milestones/AssignTemplateModal";

const FILTER_ROWS = [
  {
    key: "shipmentType",
    label: "Shipment Type",
    default: "all",
    shortLabel: (v) => (v === "Air Freight" ? "Air" : "Sea"),
    options: [
      { label: "All Types", value: "all" },
      { label: "Air Freight", value: "Air Freight" },
      { label: "Sea Freight", value: "Sea Freight" },
    ],
  },
  {
    key: "sortBy",
    label: "Sort By",
    default: "none",
    shortLabel: (v) => ({ "date-asc": "Date ↑", "date-desc": "Date ↓", "milestones-asc": "Count ↑", "milestones-desc": "Count ↓" }[v] ?? null),
    options: [
      { label: "Default (none)", value: "none" },
      { label: "Date Created ↑ (oldest)", value: "date-asc" },
      { label: "Date Created ↓ (newest)", value: "date-desc" },
      { label: "Milestones ↑ (fewest)", value: "milestones-asc" },
      { label: "Milestones ↓ (most)", value: "milestones-desc" },
    ],
  },
];

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export default function MilestoneTemplatesPage() {
  const [templates,    setTemplates]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filters,      setFilters]      = useState({ shipmentType: "all", sortBy: "none" });
  const [assignTarget, setAssignTarget] = useState(null); // { id, name } | null

  useEffect(() => {
    fetch("http://localhost:5000/api/templates")
      .then(r => r.json())
      .then(result => setTemplates(result.data ?? []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  // Remove deleted template from local state instantly (no page reload needed)
  const handleDeleted = (deletedId) => {
    setTemplates(prev => prev.filter(t => t.id !== deletedId));
  };

  let data = templates.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = t.name.toLowerCase().includes(q)
      || t.id.toLowerCase().includes(q)
      || (t.createdBy ?? "").toLowerCase().includes(q);
    const matchType = filters.shipmentType === "all" || t.shipmentType === filters.shipmentType;
    return matchSearch && matchType;
  });

  if (filters.sortBy === "date-asc")             data = [...data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  else if (filters.sortBy === "date-desc")       data = [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  else if (filters.sortBy === "milestones-asc")  data = [...data].sort((a, b) => a.milestoneCount - b.milestoneCount);
  else if (filters.sortBy === "milestones-desc") data = [...data].sort((a, b) => b.milestoneCount - a.milestoneCount);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Milestone Templates</h1>
            <p className="mt-1 text-sm text-gray-500">Manage shipment milestone templates and their timing rules.</p>
          </div>
          <Link
            href="/Super_user/milestone_template_create"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <PlusIcon />
            New Template
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Templates", value: templates.length },
            { label: "Air Freight", value: templates.filter(t => (t.shipment_type ?? t.shipmentType ?? "").toLowerCase().includes("air")).length },
            { label: "Sea Freight", value: templates.filter(t => (t.shipment_type ?? t.shipmentType ?? "").toLowerCase().includes("sea")).length },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{loading ? "..." : s.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <FilterDropdown filters={filters} setFilters={setFilters} rows={FILTER_ROWS} />
            {filters.shipmentType !== "all" && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                {filters.shipmentType}
                <button onClick={() => setFilters(f => ({ ...f, shipmentType: "all" }))} className="ml-1 hover:text-blue-900">×</button>
              </span>
            )}
            {filters.sortBy !== "none" && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-violet-50 text-violet-700 border border-violet-200 text-xs font-medium">
                {filters.sortBy.replace(/-/g, " ")}
                <button onClick={() => setFilters(f => ({ ...f, sortBy: "none" }))} className="ml-1 hover:text-violet-900">×</button>
              </span>
            )}
          </div>
          <div className="relative w-72">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon /></div>
            <input
              type="text" placeholder="Search templates..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        <TemplatesTable
          data={data}
          totalCount={templates.length}
          basePath="/Super_user/milestone_template"
          onAssign={(id, name) => setAssignTarget({ id, name })}
          onDeleted={handleDeleted}
        />

      </div>

      {/* Assign Modal */}
      <AssignTemplateModal
        isOpen={Boolean(assignTarget)}
        onClose={() => setAssignTarget(null)}
        templateId={assignTarget?.id}
        templateName={assignTarget?.name}
      />
    </div>
  );
}