'use client';

import { SlidersHorizontal } from 'lucide-react';
import '@/styles/OperationStyles/OperationDashboardHeader.css';

type Props = {
  name?: string;
};

export default function OperationDashboardHeader({ name = 'User' }: Props) {
  return (
    <div className="op-header">
      <div>
        <h1 className="op-header__title">Operation User Dashboard</h1>
        <p className="op-header__subtitle">Welcome back, {name}.</p>
      </div>

      <button className="op-header__filterBtn" type="button">
        <SlidersHorizontal className="op-header__filterIcon" />
        <span>Filter</span>
      </button>
    </div>
  );
}