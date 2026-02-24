import AdminLeftNavBar from "@/components/AdminUser/AdminLeftNavBar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Navigation Bar */}
      <AdminLeftNavBar />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}