'use client';

import { Bell, HelpCircle, Search } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ProfileDropdown from '@/components/profile/ProfileDropdown';
import '@/styles/AdminStyles/AdminTopBar.css';

export default function OperationDashboardHeader() {
  const router = useRouter();

  return (
    <div className="admin-topbar">
      <div className="admin-topbar__inner">

        {/* Left — logo + title */}
        <div className="admin-topbar__left">
          <div
            className="admin-topbar__logoWrap"
            onClick={() => router.push('/operation_user/dashboard')}
            title="Go to dashboard"
          >
            <Image
              src="/images/company-logo.png"
              alt="Company Logo"
              width={32}
              height={32}
              style={{ objectFit: 'contain', borderRadius: 5 }}
            />
          </div>
          <span className="admin-topbar__title">Dart Global Logistic SAS System</span>
        </div>

        {/* Search */}
        <div className="admin-topbar__search">
          <Search className="admin-topbar__searchIcon" />
          <input className="admin-topbar__searchInput" placeholder="Search alerts, IDs..." />
        </div>

        {/* Right */}
        <div className="admin-topbar__right">
          <button className="admin-topbar__iconBtn" aria-label="Notifications">
            <Bell className="admin-topbar__icon" />
          </button>
          <button className="admin-topbar__iconBtn" aria-label="Help">
            <HelpCircle className="admin-topbar__icon" />
          </button>
          <ProfileDropdown />
        </div>

      </div>
    </div>
  );
}