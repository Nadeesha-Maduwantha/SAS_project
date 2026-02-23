'use client';

import { Bell, HelpCircle, Search } from 'lucide-react';
import '@/styles/AdminStyles/AdminTopBar.css';

export default function AdminTopBar() {
  return (
    <div className="admin-topbar">
      <div className="admin-topbar__inner">
        {/* Left */}
        <div className="admin-topbar__left">
          <div className="admin-topbar__logo">LOGO</div>
          <div className="admin-topbar__title">Dart Global Logistic SAS System</div>
        </div>

        {/* Center Search */}
        <div className="admin-topbar__search">
          <Search className="admin-topbar__searchIcon" />
          <input
            className="admin-topbar__searchInput"
            placeholder="Search alerts, IDs..."
          />
        </div>

        {/* Right */}
        <div className="admin-topbar__right">
          <button className="admin-topbar__iconBtn" aria-label="Notifications">
            <Bell className="admin-topbar__icon" />
          </button>

          <button className="admin-topbar__iconBtn" aria-label="Help">
            <HelpCircle className="admin-topbar__icon" />
          </button>

          <div className="admin-topbar__user">
            <div className="admin-topbar__avatar" />
            <div className="admin-topbar__userText">
              <div className="admin-topbar__userName">Amal Perera</div>
              <div className="admin-topbar__userRole">Admin</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}