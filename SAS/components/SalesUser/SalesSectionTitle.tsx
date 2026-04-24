import '@/styles/SalesStyles/SalesSectionTitle.css';

type Props = {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
};

export default function SalesSectionTitle({ icon, title, right }: Props) {
  return (
    <div className="sales-section">
      <div className="sales-section__left">
        <div className="sales-section__iconWrap">{icon}</div>
        <h2 className="sales-section__title">{title}</h2>
      </div>

      {right ? <div className="sales-section__right">{right}</div> : null}
    </div>
  );
}