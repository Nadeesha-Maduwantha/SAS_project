import '@/styles/SalesStyles/SalesDashboardHeader.css';

type SalesDashboardHeaderProps = {
  name?: string;
};

export default function SalesDashboardHeader({ name }: SalesDashboardHeaderProps) {
  return (
    <div className="sales-header">
      <h1 className="sales-header__title">Sales User Dashboard</h1>
      <p className="sales-header__sub">
        {name ? `Welcome back, ${name}.` : ''}
      </p>
    </div>
  );
}
