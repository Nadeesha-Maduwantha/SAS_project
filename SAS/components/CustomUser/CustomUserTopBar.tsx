'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ProfileDropdown from '@/components/profile/ProfileDropdown';
import CoverWorkSelector from '@/components/shared/CoverWorkSelector';
import TopBarSearch from '@/components/shared/TopBarSearch';
import { useCoverEligibility } from '@/lib/hooks/useCoverEligibility';
// Reuse AdminTopBar CSS — identical styles
import '@/styles/AdminStyles/AdminTopBar.css';

export default function CustomUserTopBar() {
  const router = useRouter();
  // A custom type with Cover Access switched off (System Settings -> User
  // Types) never has anything for this selector to show — omit it rather
  // than render an always-empty widget.
  const { eligible: coverEligible } = useCoverEligibility();

  return (
    <div className="admin-topbar">
      <div className="admin-topbar__inner">

        {/* Left — logo + title */}
        <div className="admin-topbar__left">
          <div
            className="admin-topbar__logoWrap"
            onClick={() => router.push('/custom_user/dashboard')}
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
        <TopBarSearch basePath="/custom_user" />

        {/* Right */}
        <div className="admin-topbar__right">
          {coverEligible && <CoverWorkSelector />}
          <ProfileDropdown />
        </div>

      </div>
    </div>
  );
}