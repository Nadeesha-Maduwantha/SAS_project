import SuperLeftNavBar from '@/components/SuperUser/SuperLeftNavBar'
import '@/styles/SuperStyles/SuperDashboardLayout.css'

type ShipmentsLayoutProps = {
  children: React.ReactNode
}

export default function SuperUserShipmentsLayout({ children }: ShipmentsLayoutProps) {
  return (
    <div className="super-layout">
      <SuperLeftNavBar />
      <div className="super-content">
        <div className="super-inner">{children}</div>
      </div>
    </div>
  )
}