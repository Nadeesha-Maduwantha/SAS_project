import '@/styles/SalesStyles/SalesDashboardHeader.css';

type Props = {
  name?: string;
};

export default function SalesDashboardHeader({ name = 'Alex' }: Props) {
  return (
    <div className="sales-header">
      <h1 className="sales-header__title">Welcome back, {name}!</h1>
      <p className="sales-header__sub">
        Here's what's happening with your logistics today.
      </p>
    </div>
  );
}