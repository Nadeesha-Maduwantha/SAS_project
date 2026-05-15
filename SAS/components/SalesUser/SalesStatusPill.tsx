import '@/styles/SalesStyles/SalesStatusPill.css';

type Tone = 'blue' | 'purple' | 'amber';

export default function SalesStatusPill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={`sales-pill sales-pill--${tone}`}>
      <span className={`sales-pill__dot sales-pill__dot--${tone}`} />
      {label}
    </span>
  );
}