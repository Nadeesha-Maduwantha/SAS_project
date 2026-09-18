"use client";

// Global "whose work am I viewing" selection — one shared choice, persisted in
// localStorage and broadcast so every page/component stays in sync. The value is
// a list of owner emails ('' entries ignored). Empty list = just my own work,
// so pages look exactly like today when nothing is selected.
//
// Scoped PER LOGGED-IN ACCOUNT — keyed off localStorage's "user_email" (set at
// login, read the same way useAuth reads it) — rather than one shared key.
// Without this, switching accounts on the same browser inherited whatever the
// previous account had selected (e.g. an admin's earlier "select all" of 30+
// people showing up as a meaningless huge count for the next person who logs
// in). The legacy unscoped key is read as a last-resort fallback only before
// any account has ever logged in on this browser.

import { useState, useEffect } from "react";

const KEY_PREFIX = "cover_selection";
const LEGACY_KEY = "cover_selection";
const EVT = "cover-selection-changed";

function scopedKey(): string {
  if (typeof window === "undefined") return LEGACY_KEY;
  const email = (localStorage.getItem("user_email") || "").trim().toLowerCase();
  return email ? `${KEY_PREFIX}:${email}` : LEGACY_KEY;
}

export function getCoverSelection(): string[] {
  if (typeof window === "undefined") return [];
  try { return (JSON.parse(localStorage.getItem(scopedKey()) || "[]") as string[]).filter(Boolean); }
  catch { return []; }
}

export function setCoverSelection(list: string[]) {
  if (typeof window === "undefined") return;
  const key = scopedKey();
  localStorage.setItem(key, JSON.stringify(Array.from(new Set(list.filter(Boolean)))));
  // Once we know who's logged in, stop leaving anything behind in the old
  // shared key so it can't leak into whichever account logs in next.
  if (key !== LEGACY_KEY) localStorage.removeItem(LEGACY_KEY);
  window.dispatchEvent(new Event(EVT));
}

export function useCoverSelection() {
  const [selection, setSel] = useState<string[]>([]);
  useEffect(() => {
    const read = () => setSel(getCoverSelection());
    read();
    window.addEventListener(EVT, read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener(EVT, read); window.removeEventListener("storage", read); };
  }, []);
  return { selection, ownersParam: selection.join(","), setSelection: setCoverSelection };
}
