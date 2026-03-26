import { SlidersHorizontal } from 'lucide-react';
import '@/styles/OperationStyles/OperationDashboardHeader.css';

export default function OperationDashboardHeader() {
  return (
    <div className="op-header">
      <div>
        <h1 className="op-header__title">Operational Task Overview</h1>
        <p className="op-header__sub">
          Welcome back, here's what's happening with your logistics today.
        </p>
      </div>

      <button className="op-header__filterBtn" type="button">
        <SlidersHorizontal className="op-header__filterIcon" />
        <span>Filter</span>
      </button>
    </div>
  );
}