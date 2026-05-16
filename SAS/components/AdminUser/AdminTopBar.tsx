'use client';

import { Bell, HelpCircle, Search } from 'lucide-react';
import ProfileDropdown from '@/components/profile/ProfileDropdown';
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

          {/* Replace hardcoded user with dynamic ProfileDropdown */}
          <ProfileDropdown />
          
        </div>
      </div>
    </div>
  );
}