import type { ReactNode } from 'react';
import '@/styles/AdminStyles/StatCard.css';

type Props = {
  title: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
};

export default function StatCard({ title, value, hint, icon }: Props) {
  return (
    <div className="stat-card">
      <div className="stat-card__top">
        <div className="stat-card__left">
          <div className="stat-card__iconWrap">{icon}</div>
          <div className="stat-card__title">{title}</div>
        </div>
      </div>

      <div className="stat-card__value">{value}</div>

      {hint && <div className="stat-card__hint">{hint}</div>}
    </div>
  );
}