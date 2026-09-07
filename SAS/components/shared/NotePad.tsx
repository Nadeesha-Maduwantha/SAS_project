'use client';

// =============================================================
//  NotePad.tsx
//  Path: components/shared/NotePad.tsx
//
//  Dashboard notepad backed by the user_notes table.
//  Full CRUD: list, create, edit, delete.
//
//  Notes are private. Every request is scoped by the signed-in
//  email, so a user only ever sees their own notes — the previous
//  version keyed on the mock staff code, which is the same string
//  for everyone, so all notes were shared.
//
//  A note is just its text plus an optional shipment link — there is
//  no title field.
//
//  A note can also be attached to one of the user's own shipments,
//  picked from the dropdown in the editor. The link is editable:
//  reopen the note and choose a different shipment, or "No shipment"
//  to detach it.
//
//  Needs Backend/migrations/user_notes.sql to have been run. Until
//  then the API replies with an empty list plus a warning, which is
//  surfaced in the card rather than failing silently.
// =============================================================

import { useCallback, useEffect, useState } from 'react';
import { NotebookPen, Plus, Package } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { normalizeRole } from '@/lib/roles';
import '@/styles/AdminStyles/FeedTable.css';
import '@/styles/AdminStyles/NotePad.css';

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://127.0.0.1:5000';

type Note = {
  id:                  string;
  owner_email:         string | null;
  staff_code:          string | null;
  body:                string;
  shipment_id:         string | null;
  shipment_job_number: string | null;
  created_at:          string;
  updated_at:          string;
};

/** One entry in the shipment dropdown. */
type ShipmentOption = {
  id:    string;
  label: string;
};

/** 'new' means the editor is open for a note that does not exist yet. */
type Editing = Note | 'new' | null;

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { Authorization: `Bearer ${token}` };
}

/**
 * Query string that narrows /api/shipments to the shipments this user owns.
 * The two roles own shipments differently: a sales user owns the shipment
 * itself, an operation user is assigned to one of its milestones.
 * Any other role gets no dropdown rather than the whole company's shipments.
 */
function ownedShipmentsQuery(role: string, email: string): string | null {
  if (!email) return null;
  const key = normalizeRole(role);
  if (key === 'salesuser')     return `?sales_user_email=${encodeURIComponent(email)}`;
  if (key === 'operationuser') return `?assigned_email=${encodeURIComponent(email)}`;
  return null;
}

/** Human label for a shipment row: job number first, consignee as context. */
function shipmentLabel(row: any): string {
  const ref = row.job_number || row.house_bill_number || row.cargowise_id || row.id;
  const who = row.consignee_name;
  return who ? `${ref} — ${who}` : String(ref);
}

export default function NotePad({
  title = 'My Notes',
  subtitle = 'Private to you — only you can see these notes',
}: {
  title?:    string;
  subtitle?: string;
}) {
  const { email, role, staffCode } = useAuth();

  const [notes, setNotes] = useState<Note[]>([]);
  const [shipments, setShipments] = useState<ShipmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Editing>(null);
  const [draftBody, setDraftBody] = useState('');
  const [draftShipment, setDraftShipment] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!email) { setLoading(false); return; }
    try {
      setError(null);
      const res = await fetch(`${API}/api/notes?email=${encodeURIComponent(email)}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);

      setNotes(json.data ?? []);
      setWarning(json.warning ?? null);
    } catch (err) {
      console.error('Failed to load notes:', err);
      setError('Could not load notes');
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => { load(); }, [load]);

  // The dropdown only ever offers shipments this user owns, which is also
  // what the backend re-checks before storing the link.
  useEffect(() => {
    const query = ownedShipmentsQuery(role, email);
    if (!query) { setShipments([]); return; }

    let cancelled = false;
    fetch(`${API}/api/shipments${query}`, { headers: authHeaders(), cache: 'no-store' })
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        const rows: any[] = json?.data ?? [];
        setShipments(rows.map(row => ({ id: row.id, label: shipmentLabel(row) })));
      })
      .catch(err => console.error('Failed to load shipments for notes:', err));

    return () => { cancelled = true; };
  }, [role, email]);

  function openNew() {
    setEditing('new');
    setDraftBody('');
    setDraftShipment('');
    setError(null);
  }

  function openExisting(note: Note) {
    setEditing(note);
    setDraftBody(note.body ?? '');
    setDraftShipment(note.shipment_id ?? '');
    setError(null);
  }

  function closeEditor() {
    setEditing(null);
    setDraftBody('');
    setDraftShipment('');
  }

  async function save() {
    if (!draftBody.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const isNew = editing === 'new';
      const res = await fetch(
        isNew
          ? `${API}/api/notes`
          : `${API}/api/notes/${(editing as Note).id}?email=${encodeURIComponent(email)}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            body: draftBody,
            // Always sent, so clearing the dropdown detaches the shipment.
            shipment_id: draftShipment,
            ...(isNew ? { staff_code: staffCode } : {}),
          }),
        },
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);

      closeEditor();
      await load();
    } catch (err) {
      console.error('Failed to save note:', err);
      setError(err instanceof Error ? err.message : 'Could not save the note');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (editing === null || editing === 'new') return;
    if (!window.confirm('Delete this note?')) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `${API}/api/notes/${editing.id}?email=${encodeURIComponent(email)}`,
        { method: 'DELETE' },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);

      closeEditor();
      await load();
    } catch (err) {
      console.error('Failed to delete note:', err);
      setError(err instanceof Error ? err.message : 'Could not delete the note');
    } finally {
      setSaving(false);
    }
  }

  const canSave = draftBody.trim() !== '' && !saving;

  /** Label for a saved link, even when that shipment is no longer in the list. */
  function labelFor(note: Note): string | null {
    if (!note.shipment_id) return null;
    const match = shipments.find(s => s.id === note.shipment_id);
    return match?.label ?? note.shipment_job_number ?? 'Linked shipment';
  }

  return (
    <div className="feed-card">
      <div className="feed-card__head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 'var(--radius-inner)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              backgroundColor: 'color-mix(in srgb, var(--c-chart-4) 10%, transparent)',
            }}
          >
            <NotebookPen size={18} color="var(--c-chart-4)" />
          </div>
          <div>
            <h2 className="feed-card__title">{title}</h2>
            <div className="feed-card__sub">{subtitle}</div>
          </div>
        </div>

        {editing === null && (
          <button className="feed-card__link" onClick={openNew}>
            <Plus size={12} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
            New note
          </button>
        )}
      </div>

      {/* A failed write against a missing table repeats the warning verbatim —
          show it once rather than stacking two banners saying the same thing. */}
      {warning && <div className="note-warning">{warning}</div>}
      {error && error !== warning && <div className="note-error">{error}</div>}

      {editing !== null ? (
        <div style={{ paddingTop: 12 }}>
          <select
            className="note-select note-select--first"
            value={draftShipment}
            onChange={e => setDraftShipment(e.target.value)}
          >
            <option value="">No shipment</option>
            {shipments.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
            {/* A note may point at a shipment that has since left the list —
                keep the option so saving does not silently drop the link. */}
            {editing !== 'new'
              && editing.shipment_id
              && !shipments.some(s => s.id === editing.shipment_id) && (
              <option value={editing.shipment_id}>
                {editing.shipment_job_number ?? 'Linked shipment'}
              </option>
            )}
          </select>

          <textarea
            className="note-textarea"
            placeholder="Write your note…"
            value={draftBody}
            onChange={e => setDraftBody(e.target.value)}
          />

          <div className="note-actions">
            <button className="note-btn note-btn--primary" onClick={save} disabled={!canSave}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="note-btn" onClick={closeEditor} disabled={saving}>
              Cancel
            </button>
            {editing !== 'new' && (
              <button className="note-btn note-btn--danger" onClick={remove} disabled={saving}>
                Delete
              </button>
            )}
          </div>
        </div>
      ) : loading ? (
        <div className="note-empty">Loading…</div>
      ) : notes.length === 0 ? (
        <div className="note-empty">No notes yet — use “New note” to add one.</div>
      ) : (
        <div className="note-list">
          {notes.map(note => {
            const linked = labelFor(note);
            return (
              <button key={note.id} className="note-item" onClick={() => openExisting(note)}>
                {linked && (
                  <div className="note-item__shipment">
                    <Package size={11} style={{ flexShrink: 0 }} />
                    <span className="note-item__shipment-label">{linked}</span>
                  </div>
                )}
                <div className="note-item__text">{note.body}</div>
                <div className="note-item__time">{formatWhen(note.updated_at)}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
