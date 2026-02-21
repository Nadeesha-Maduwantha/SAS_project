import AdminLeftNavBar from '../../../components/AdminUser/AdminLeftNavBar';

export default function AdminPage() {
  return (
    <div style={{ display: 'flex' }}>
      <AdminLeftNavBar />

      <main style={{ padding: 24, flex: 1 }}>
        <h1>Admin - Test Page</h1>
        <p></p>
      </main>
    </div>
  );
}