import type { ReactNode } from 'react';

import OperationLeftNavBar from '@/components/OperationUser/OperationLeftNavBar';
import '@/styles/OperationStyles/OperationDashboardLayout.css';

type Props = {
  children: ReactNode;
};

export default function OperationUserShipmentsLayout({ children }: Props) {
  return (
    <div className="op-layout">
      <OperationLeftNavBar />

      <div className="op-content">
        <div className="op-inner">{children}</div>
      </div>
    </div>
  );
}
