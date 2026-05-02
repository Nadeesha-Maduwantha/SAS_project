import type { ReactNode } from 'react';

import AdminLeftNavBar from '@/components/AdminUser/AdminLeftNavBar';
import AdminTopBar from '@/components/AdminUser/AdminTopBar';
import '@/styles/AdminStyles/AdminLayout.css';

type Props = {
  children: ReactNode;
};

export default function AdminShipmentsLayout({ children }: Props) {
  return (
    <div className="admin-layout">
      <AdminLeftNavBar />

      <div className="admin-content">
        <AdminTopBar />
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
