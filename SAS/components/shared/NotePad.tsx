'use client';

// =============================================================
//  NotePad.tsx
//  Path: components/shared/NotePad.tsx
//
//  Dashboard notepad backed by the user_notes table.
//  Full CRUD: list, create, edit, delete.
//
//  Needs Backend/migrations/user_notes.sql to have been run. Until
//  then the API replies with an empty list plus a warning, which is
//  surfaced in the card rather than failing silently.
// =============================================================

import { useCallback, useEffect, useState } from 'react';
import { NotebookPen, Plus } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import '@/styles/AdminStyles/FeedTable.css';
import '@/styles/AdminStyles/NotePad.css';

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://127.0.0.1:5000';

type Note = {
  id:         string;
  staff_code: string;
  title:      string | null;
  body:       string;
  created_at: string;
  updated_at: string;
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

export default function NotePad({
  title = 'My Notes',
  subtitle = 'Personal notes — saved to your account',
}: {
  title?:    string;
  subtitle?: string;
}) {
  const { staffCode } = useAuth();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Editing>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API}/api/notes?staff_code=${encodeURIComponent(staffCode)}`, {
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
  }, [staffCode]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing('new');
    setDraftTitle('');
    setDraftBody('');
    setError(null);
  }

  function openExisting(note: Note) {
    setEditing(note);
    setDraftTitle(note.title ?? '');
    setDraftBody(note.body ?? '');
    setError(null);
  }

  function closeEditor() {
    setEditing(null);
    setDraftTitle('');
    setDraftBody('');
  }

  async function save() {
    if (!draftTitle.trim() && !draftBody.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const isNew = editing === 'new';
      const res = await fetch(
        isNew ? `${API}/api/notes` : `${API}/api/notes/${(editing as Note).id}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            isNew
              ? { staff_code: staffCode, title: draftTitle, body: draftBody }
              : { title: draftTitle, body: draftBody },
          ),
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
      const res = await fetch(`${API}/api/notes/${editing.id}`, { method: 'DELETE' });
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

  const canSave = (draftTitle.trim() !== '' || draftBody.trim() !== '') && !saving;

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
          <input
            className="note-input"
            placeholder="Note title"
            value={draftTitle}
            onChange={e => setDraftTitle(e.target.value)}
            maxLength={200}
          />
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
          {notes.map(note => (
            <button key={note.id} className="note-item" onClick={() => openExisting(note)}>
              <div className="note-item__title">{note.title || 'Untitled note'}</div>
              {note.body && <div className="note-item__preview">{note.body}</div>}
              <div className="note-item__time">{formatWhen(note.updated_at)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
