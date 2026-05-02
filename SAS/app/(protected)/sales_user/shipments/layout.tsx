import type { ReactNode } from 'react';

import SalesLeftNavBar from '@/components/SalesUser/SalesLeftNavBar';
import '@/styles/SalesStyles/SalesDashboardLayout.css';

type Props = {
  children: ReactNode;
};

export default function SalesUserShipmentsLayout({ children }: Props) {
  return (
    <div className="sales-layout">
      <SalesLeftNavBar />

      <div className="sales-content">
        <div className="sales-inner">{children}</div>
      </div>
    </div>
  );
}
