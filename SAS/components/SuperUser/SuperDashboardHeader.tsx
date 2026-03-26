import { Calendar } from 'lucide-react';
import '@/styles/SuperStyles/SuperDashboardHeader.css';

export default function SuperDashboardHeader() {
  return (
    <div className="super-header">
      <div>
        <h1 className="super-header__title">Department Overview</h1>
        <p className="super-header__sub">
          Super User Dashboard • Tracking 128 active operations
        </p>
      </div>

      <button className="super-header__dateBtn">
        <Calendar className="super-header__dateIcon" />
        <span>Oct 24 - Oct 30, 2023</span>
      </button>
    </div>
  );
}