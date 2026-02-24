import '@/styles/OperationStyles/OperationStatCard.css';

type Props = {
  title: string;
  value: string;
  meta: string;
  tone: 'blue' | 'purple' | 'green' | 'red';
  icon: React.ReactNode;
};

export default function OperationStatCard({ title, value, meta, tone, icon }: Props) {
  return (
    <div className="op-stat">
      <div className="op-stat__top">
        <div className={`op-stat__dot op-stat__dot--${tone}`} />
        <span className="op-stat__title">{title}</span>

        <div className="op-stat__iconWrap">{icon}</div>
      </div>

      <div className="op-stat__valueRow">
        <div className="op-stat__value">{value}</div>
        <div className={`op-stat__meta op-stat__meta--${tone}`}>{meta}</div>
      </div>
    </div>
  );
}