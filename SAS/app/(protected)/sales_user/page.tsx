import SalesLeftNavBar from '../../../components/SalesUser/SalesLeftNavBar';

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex' }}>
      <SalesLeftNavBar userName="Alex Morgan" roleLabel="SALES USER" />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}