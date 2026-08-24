'use client';

// =============================================================
//  PinnedTableModal.jsx
//  Opens a pinned custom table's full content in a popup,
//  reusing the exact CustomTableView from the Custom Tables page
//  (filters, toolbar, DataTable) — no page navigation.
// =============================================================

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { CustomTableView } from '@/components/shared/CustomTablesPage';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5001';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export default function PinnedTableModal({ table, onClose }) {
  // Close on Escape + lock background scroll while open
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!table) return null;

  const title    = table.filters?.consignee_name || table.name;
  const subtitle = table.data_source === 'shipments' ? 'Shipments' : 'Alerts';

  // Delete from within the popup — confirm, call API, then close (parent refreshes).
  const handleDelete = async (id) => {
    if (!confirm('Delete this custom table? This cannot be undone.')) return;
    try {
      await fetch(`${API}/api/custom-tables/${id}`, { method: 'DELETE', headers: authHeaders() });
    } catch { /* ignore */ }
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, animation: 'ptmFade 0.15s ease',
      }}
    >
      <style>{`@keyframes ptmFade { from { opacity: 0 } to { opacity: 1 } }`}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card-bg, #fff)',
          border: '1px solid var(--card-border-color, #E5E7EB)',
          borderRadius: 14,
          width: 'min(1100px, 96vw)',
          maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--card-border-color, #F3F4F6)',
          flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {subtitle}
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-900, #111827)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              border: '1px solid var(--card-border-color, #E5E7EB)',
              background: 'var(--card-bg, #fff)', color: '#6B7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body — the exact same content as the Custom Tables page tab */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <CustomTableView
            tableConfig={table}
            onSendAlert={() => { /* local "Alert Sent!" feedback handled inside */ }}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
