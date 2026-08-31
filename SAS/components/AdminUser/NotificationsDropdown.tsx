'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, KeyRound, ShieldAlert, Monitor } from 'lucide-react';

type NotificationType = 'failed_login' | 'password_changed' | 'permission_changed' | 'new_device_login';

type Notification = {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: string;
};

const ICONS: Record<NotificationType, React.ReactNode> = {
  failed_login:       <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />,
  password_changed:   <KeyRound size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />,
  permission_changed: <ShieldAlert size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />,
  new_device_login:   <Monitor size={16} className="text-purple-500 flex-shrink-0 mt-0.5" />,
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      try {
        const res = await fetch('http://localhost:5000/api/notifications', {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.data)) {
          setNotifications(data.data);
        }
      } catch (err) {
        console.error('NotificationsDropdown: failed to fetch notifications', err);
      }
    };
    fetchNotifications();
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>

      {/* ── Trigger ─────────────────────────────────────────── */}
      <button
        className="admin-topbar__iconBtn"
        aria-label="Notifications"
        onClick={() => setIsOpen(o => !o)}
      >
        <Bell className="admin-topbar__icon" />
        {notifications.length > 0 && <span className="notification-dot" />}
      </button>

      {/* ── Dropdown ────────────────────────────────────────── */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-[340px] rounded-xl shadow-xl border z-50
                        bg-white border-gray-100
                        dark:bg-slate-800 dark:border-slate-700">

          <div className="p-4 rounded-t-xl bg-slate-50/60 dark:bg-slate-700/60">
            <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
              Security Notifications
            </h3>
          </div>

          <hr className="border-gray-100 dark:border-slate-700 mx-2" />

          <div className="max-h-80 overflow-y-auto py-1.5">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-slate-400 dark:text-slate-500">
                No recent security notifications.
              </p>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 px-4 py-2.5 text-[13px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                >
                  {ICONS[n.type]}
                  <div className="min-w-0">
                    <p className="leading-snug">{n.message}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{timeAgo(n.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}
    </div>
  );
}
