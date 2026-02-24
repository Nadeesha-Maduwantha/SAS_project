import '@/styles/SuperStyles/SuperStatCard.css';

type Props = {
  icon: React.ReactNode;
  label: string;
  value: string;
  meta: string;
  metaTone?: 'good' | 'bad' | 'neutral';
};

export default function SuperStatCard({ icon, label, value, meta, metaTone = 'neutral' }: Props) {
  return (
    <div className="super-stat">
      <div className="super-stat__top">
        <div className="super-stat__iconWrap">{icon}</div>
        <span className={`super-stat__meta super-stat__meta--${metaTone}`}>{meta}</span>
      </div>

      <div className="super-stat__label">{label}</div>
      <div className="super-stat__value">{value}</div>
    </div>
  );
}