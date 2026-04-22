import { SlidersHorizontal } from 'lucide-react';
import '@/styles/OperationStyles/OperationDashboardHeader.css';

export default function OperationDashboardHeader() {
  return (
    <div className="op-header">
      <div>
        <h1 className="op-header__title">Operation User Dashboard</h1>
      </div>

      <button className="op-header__filterBtn" type="button">
        <SlidersHorizontal className="op-header__filterIcon" />
        <span>Filter</span>
      </button>
    </div>
  );
}