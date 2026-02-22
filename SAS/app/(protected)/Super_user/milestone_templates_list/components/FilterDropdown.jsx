"use client";

import { useState, useRef, useEffect } from "react";

// ─── Icons ────────────────────────────────────────────────────────────────────
const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * FilterDropdown
 *
 * A reusable flyout filter + sort menu. Each menu row expands into a side submenu
 * on hover, matching the Windows Explorer "Sort by ▶" pattern.
 *
 * Props:
 *   filters       — { [key]: value }  current filter state
 *   setFilters    — state setter
 *   rows          — array of row config objects (see below)
 *   label         — button label  (default: "Filter & Sort")
 *
 * Row config shape:
 * {
 *   key:     string               — key in `filters` this row controls
 *   label:   string               — row label shown in the main dropdown
 *   default: string               — the value that means "no filter" (e.g. "all" / "none")
 *   shortLabel: (value) => string — optional fn: returns a short label shown next to chevron
 *   options: [{ label, value }]   — submenu options
 * }
 *
 * Example usage:
 *
 *   const ROWS = [
 *     {
 *       key: "shipmentType",
 *       label: "Shipment Type",
 *       default: "all",
 *       shortLabel: (v) => v === "Air Freight" ? "Air" : "Sea",
 *       options: [
 *         { label: "All Types", value: "all" },
 *         { label: "Air Freight", value: "Air Freight" },
 *         { label: "Sea Freight", value: "Sea Freight" },
 *       ],
 *     },
 *     {
 *       key: "sortBy",
 *       label: "Sort By",
 *       default: "none",
 *       options: [
 *         { label: "Default (none)", value: "none" },
 *         { label: "Date ↑ oldest", value: "date-asc" },
 *         { label: "Date ↓ newest", value: "date-desc" },
 *       ],
 *     },
 *   ];
 *
 *   <FilterDropdown filters={filters} setFilters={setFilters} rows={ROWS} />
 */
export default function FilterDropdown({ filters, setFilters, rows = [], label = "Filter & Sort" }) {
  const [open, setOpen] = useState(false);
  const [hoveredKey, setHoveredKey] = useState(null);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Count active (non-default) filters
  const activeCount = rows.filter((r) => filters[r.key] !== r.default).length;

  const handleSelect = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setOpen(false);
  };

  const handleClear = () => {
    const reset = {};
    rows.forEach((r) => { reset[r.key] = r.default; });
    setFilters((prev) => ({ ...prev, ...reset }));
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
          open || activeCount > 0
            ? "border-blue-500 bg-blue-50 text-blue-700"
            : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        <FilterIcon />
        {label}
        {activeCount > 0 && (
          <span className="ml-1 flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {/* Main dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 z-50 w-52 rounded-xl border border-gray-200 bg-white shadow-xl overflow-visible">
          {rows.map((row, idx) => {
            const isActive = filters[row.key] !== row.default;
            const shortLabel = row.shortLabel
              ? row.shortLabel(filters[row.key])
              : isActive
              ? filters[row.key]
              : null;

            return (
              <div key={row.key}>
                {idx > 0 && <div className="h-px bg-gray-100 mx-3" />}

                <div
                  className="relative flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onMouseEnter={() => setHoveredKey(row.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                >
                  <span className="text-sm font-medium text-gray-700">{row.label}</span>

                  <div className="flex items-center gap-1 text-gray-400">
                    {isActive && shortLabel && (
                      <span className="text-xs text-blue-600 font-medium">{shortLabel}</span>
                    )}
                    <ChevronRight />
                  </div>

                  {/* Side submenu */}
                  {hoveredKey === row.key && (
                    <div className="absolute left-full top-0 ml-1 w-52 rounded-xl border border-gray-200 bg-white shadow-xl z-50 overflow-hidden">
                      {row.options.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleSelect(row.key, opt.value)}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            filters[row.key] === opt.value
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Clear all */}
          {activeCount > 0 && (
            <>
              <div className="h-px bg-gray-100 mx-3" />
              <button
                onClick={handleClear}
                className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors rounded-b-xl"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}