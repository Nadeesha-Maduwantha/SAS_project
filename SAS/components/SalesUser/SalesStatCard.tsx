import '@/styles/SalesStyles/SalesStatCard.css';

type Tone = 'amber' | 'blue' | 'purple' | 'green';

type Props = {
  tone: Tone;
  title: string;
  value: string;
  
  icon: React.ReactNode;
};

export default function SalesStatCard({ tone, title, value,  icon }: Props) {
  return (
    <div className="sales-stat">
      <div className="sales-stat__top">
        <div className="sales-stat__left">
          <div className="sales-stat__iconWrap">{icon}</div>
          <div className="sales-stat__title">{title}</div>
        </div>
      </div>

      <div className="sales-stat__value">{value}</div>
      <div className="sales-stat__meta">
        
        
      </div>
    </div>
  );
}