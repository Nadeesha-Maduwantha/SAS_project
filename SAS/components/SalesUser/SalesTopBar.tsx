'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ProfileDropdown from '@/components/profile/ProfileDropdown';
import TopBarSearch from '@/components/shared/TopBarSearch';
// Reuse AdminTopBar CSS — identical styles
import '@/styles/AdminStyles/AdminTopBar.css';

export default function SalesTopBar() {
  const router = useRouter();

  return (
    <div className="admin-topbar">
      <div className="admin-topbar__inner">

        {/* Left — logo + title */}
        <div className="admin-topbar__left">
          <div
            className="admin-topbar__logoWrap"
            onClick={() => router.push('/sales_user/dashboard')}
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
        <TopBarSearch basePath="/sales_user" />

        {/* Right */}
        <div className="admin-topbar__right">
          <ProfileDropdown />
        </div>

      </div>
    </div>
  );
}