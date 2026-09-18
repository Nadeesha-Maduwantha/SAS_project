"use client";

// =============================================================
//  CountrySelect — searchable country picker, used on the Create
//  User forms in place of the old fixed Ethnicity list. Type to
//  filter, click (or Enter) to pick.
//
//  Note: this writes into the SAME `ethnicity` field the backend
//  already stores (profiles.ethnicity) — only the label, options
//  and search moved to "country"; no schema/API change was needed
//  since that column was always free text.
// =============================================================

import { useState, useRef, useEffect } from "react";
import { COUNTRIES } from "@/lib/countries";

type Props = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export default function CountrySelect({ value, onChange, required }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = query.trim().toLowerCase();
  const matches = q ? COUNTRIES.filter(c => c.toLowerCase().includes(q)) : COUNTRIES;

  const pick = (country: string) => {
    onChange(country);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        type="text"
        value={open ? query : value}
        onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => { setQuery(""); setOpen(true); }}
        placeholder="Search country…"
        required={required}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {matches.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-400">No matches.</div>
          ) : (
            matches.map(c => (
              <div
                key={c}
                onClick={() => pick(c)}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 ${c === value ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-900"}`}
              >
                {c}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
