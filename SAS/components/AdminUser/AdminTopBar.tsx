'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, HelpCircle, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import '@/styles/AdminStyles/AdminTopBar.css';

const alerts = [
  { id: 1, text: 'Shipment #DGL-82910 delayed', time: '2h ago' },
  { id: 2, text: 'Customs hold detected', time: '5h ago' },
  { id: 3, text: 'New shipment assigned', time: '1 day ago' },
  { id: 4, text: 'Milestone missed', time: '2 days ago' },
];

export default function AdminTopBar() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // close when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="admin-topbar">
      <div className="admin-topbar__inner">

        {/* LEFT */}
        <div className="admin-topbar__left">
          <div className="admin-topbar__logo">LOGO</div>
          <div className="admin-topbar__title">
            Dart Global Logistic SAS System
          </div>
        </div>

        {/* SEARCH */}
        <div className="admin-topbar__search">
          <Search className="admin-topbar__searchIcon" />
          <input
            className="admin-topbar__searchInput"
            placeholder="Search alerts, IDs..."
          />
        </div>

        {/* RIGHT */}
        <div className="admin-topbar__right">

          {/* 🔔 NOTIFICATION */}
          <div className="notif-wrap" ref={wrapRef}>
            <button
              className="admin-topbar__iconBtn"
              onClick={() => setOpen((p) => !p)}
            >
              <Bell className="admin-topbar__icon" />
            </button>

            {open && (
              <div className="notif-dropdown">
                <div className="notif-header">
                  Notifications
                </div>

                <div className="notif-list">
                  {alerts.map((a) => (
                    <div key={a.id} className="notif-item">
                      <div className="notif-text">{a.text}</div>
                      <div className="notif-time">{a.time}</div>
                    </div>
                  ))}
                </div>

                <div
                  className="notif-footer"
                  onClick={() => {
                    setOpen(false);
                    router.push('/admin/alerts'); // 👉 redirect
                  }}
                >
                  See all
                </div>
              </div>
            )}
          </div>

          {/* HELP */}
          <button className="admin-topbar__iconBtn">
            <HelpCircle className="admin-topbar__icon" />
          </button>

          {/* USER */}
          <div className="admin-topbar__user">
            <div className="admin-topbar__avatar" />
            <div>
              <div className="admin-topbar__userName">Amal Perera</div>
              <div className="admin-topbar__userRole">Admin</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}