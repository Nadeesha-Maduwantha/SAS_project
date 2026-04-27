import '@/styles/SalesStyles/SalesStatCard.css';

type Tone = 'amber' | 'blue' | 'purple' | 'green';

type Props = {
  tone: Tone;
  title: string;
  value: string;
  delta: string;
  updated: string;
  icon: React.ReactNode;
};

export default function SalesStatCard({ tone, title, value, delta, updated, icon }: Props) {
  return (
    <div className={`sales-stat sales-stat--${tone}`}>
      <div className="sales-stat__top">
        <div className="sales-stat__mini">
          <div className={`sales-stat__miniIcon sales-stat__miniIcon--${tone}`}>
            {icon}
          </div>
          <span className="sales-stat__chip">{updated}</span>
        </div>
      </div>

      <div className="sales-stat__title">{title}</div>

      <div className="sales-stat__bottom">
        <div className="sales-stat__value">{value}</div>
        <div className="sales-stat__delta">{delta}</div>
      </div>
    </div>
  );
}