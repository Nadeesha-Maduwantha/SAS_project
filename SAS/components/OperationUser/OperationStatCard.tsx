import '@/styles/OperationStyles/OperationStatCard.css';

type Props = {
  title: string;
  value: string;
  icon: React.ReactNode;
};

export default function OperationStatCard({ title, value, icon }: Props) {
  return (
    <div className="op-stat">
      <div className="op-stat__top">
        <div className="op-stat__left">
          <div className="op-stat__iconWrap">{icon}</div>
          <div className="op-stat__title">{title}</div>
        </div>
      </div>

      <div className="op-stat__value">{value}</div>
    </div>
  );
}