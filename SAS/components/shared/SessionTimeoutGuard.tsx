'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const FLASK_API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

function clearSession() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_department');
  document.cookie = 'access_token=; path=/; max-age=0';
  document.cookie = 'user_role=; path=/; max-age=0';
}

// Enforces the "Session Timeout" / "Auto-logout on inactivity" values from
// Security Settings. Those were previously only ever saved and displayed —
// nothing read them back to actually log anyone out. Mounted once in the
// (protected) group layout so it covers every role without duplicating this
// in each role's own layout.
export default function SessionTimeoutGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutMsRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const logout = () => {
      clearSession();
      router.push('/?session=timeout');
    };

    const resetTimer = () => {
      if (timeoutMsRef.current === null) return; // not configured yet, or disabled
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, timeoutMsRef.current);
    };

    const loadSettings = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      try {
        const res = await fetch(`${FLASK_API}/api/security-settings/general`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (cancelled || !res.ok) return;

        const { autoLogoutOnInactivity, timeoutMinutes } = data.data?.sessionManagement ?? {};
        if (autoLogoutOnInactivity && timeoutMinutes > 0) {
          timeoutMsRef.current = timeoutMinutes * 60 * 1000;
          resetTimer();
        }
      } catch {
        // If settings can't be loaded, fail open (no forced timeout) rather
        // than logging everyone out because of a network blip.
      }
    };

    loadSettings();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer));

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
