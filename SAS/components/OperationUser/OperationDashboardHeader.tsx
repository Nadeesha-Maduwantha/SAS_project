'use client';

import '@/styles/OperationStyles/OperationDashboardHeader.css';

type Props = {
  name?: string;
};

export default function OperationDashboardHeader() {
  return (
    <div className="op-header">
      <div>
        <h1 className="op-header__title">Operation User Dashboard</h1>
        
      </div>

      
    </div>
  );
}