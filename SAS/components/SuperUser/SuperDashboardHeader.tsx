import { Calendar } from 'lucide-react';
import '@/styles/SuperStyles/SuperDashboardHeader.css';

export default function SuperDashboardHeader() {
  return (
    <div className="super-header">
      <div>
        <h1 className="super-header__title">Super User Dashboard</h1>
        
      </div>

      <button className="super-header__dateBtn">
        <Calendar className="super-header__dateIcon" />
        <span>Oct 24 - Oct 30, 2023</span>
      </button>
    </div>
  );
}