import '@/styles/SalesStyles/SalesSectionTitle.css';

type Props = {
  
  title: string;
  right?: React.ReactNode;
};

export default function SalesSectionTitle({  title, right }: Props) {
  return (
    <div className="sales-section">
      <div className="sales-section__left">
        
        <h2 className="sales-section__title">{title}</h2>
      </div>

      {right ? <div className="sales-section__right">{right}</div> : null}
    </div>
  );
}