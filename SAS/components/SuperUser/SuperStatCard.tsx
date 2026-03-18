import '@/styles/SuperStyles/SuperStatCard.css';

type Props = {
  icon: React.ReactNode;
  label: string;
  value: string;
  
};

export default function SuperStatCard({ icon, label, value, }: Props) {
  return (
    <div className="super-stat">
      <div className="super-stat__top">
        <div className="super-stat__iconWrap">{icon}</div>
        
      </div>

      <div className="super-stat__label">{label}</div>
      <div className="super-stat__value">{value}</div>
    </div>
  );
}