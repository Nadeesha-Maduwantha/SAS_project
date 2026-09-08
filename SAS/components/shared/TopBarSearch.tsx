'use client';

// =============================================================
//  TopBarSearch.tsx
//  Path: components/shared/TopBarSearch.tsx
//
//  Working search for the role topbars. Matches shipments on their
//  CargoWise id, job number, house bill number and consignee, and
//  opens the shipments page for the current role on selection.
//
//  The whole shipment list is fetched once on first focus and then
//  filtered in the browser. At around a hundred shipments this is
//  faster than a request per keystroke, and there is no search
//  endpoint on the backend to call.
// =============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { getAllShipments } from '@/lib/services/shipment.service';
import type { Shipment } from '@/types';

const MAX_RESULTS = 7;

export default function TopBarSearch({
  basePath,
  placeholder = 'Search shipments, IDs, consignees…',
}: {
  /** Role route prefix, e.g. "/admin" — selecting a result opens its shipments page. */
  basePath:     string;
  placeholder?: string;
}) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Load once, on first focus — not on mount, so topbars on pages the user
  // never searches from cost nothing.
  const ensureLoaded = useCallback(async () => {
    if (shipments !== null || loading) return;
    setLoading(true);
    try {
      setShipments(await getAllShipments());
    } catch (err) {
      console.error('Failed to load shipments for search:', err);
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }, [shipments, loading]);

  // Close on click outside and on Escape.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const term = query.trim().toLowerCase();

  const results = term.length < 2 || !shipments
    ? []
    : shipments
        .filter(s =>
          [s.cargowiseId, s.jobNumber, s.houseBillNumber, s.consigneeName]
            .some(v => (v ?? '').toString().toLowerCase().includes(term)),
        )
        .slice(0, MAX_RESULTS);

  function select() {
    setOpen(false);
    router.push(`${basePath}/shipments`);
  }

  return (
    <div className="admin-topbar__searchWrap" ref={wrapRef}>
      <div className="admin-topbar__search">
        <Search className="admin-topbar__searchIcon" />
        <input
          className="admin-topbar__searchInput"
          placeholder={placeholder}
          value={query}
          onFocus={() => { ensureLoaded(); setOpen(true); }}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={e => { if (e.key === 'Enter' && results.length > 0) select(); }}
          aria-label="Search shipments"
        />
        {query && (
          <button
            className="admin-topbar__searchClear"
            onClick={() => { setQuery(''); setOpen(false); }}
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {open && term.length >= 2 && (
        <div className="admin-topbar__results">
          {loading ? (
            <div className="admin-topbar__resultEmpty">Loading shipments…</div>
          ) : results.length === 0 ? (
            <div className="admin-topbar__resultEmpty">No shipment matches “{query.trim()}”</div>
          ) : (
            <>
              {results.map(s => (
                <button key={s.id} className="admin-topbar__result" onClick={select}>
                  <span className="admin-topbar__resultId">{s.cargowiseId ?? s.jobNumber ?? '—'}</span>
                  <span className="admin-topbar__resultName">{s.consigneeName ?? 'No consignee'}</span>
                  {s.pickupDateStatus && (
                    <span className="admin-topbar__resultTag">{s.pickupDateStatus}</span>
                  )}
                </button>
              ))}
              <div className="admin-topbar__resultFoot">
                Press Enter to open the shipments page
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
