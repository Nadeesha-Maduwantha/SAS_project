import { Shield } from 'lucide-react';
import '@/styles/AdminStyles/AdminBanner.css';

export default function AdminBanner() {
  return (
    <div className="admin-banner">
      <div className="admin-banner__left">
        <div className="admin-banner__iconWrap">
          <Shield className="admin-banner__icon" />
        </div>

        <div>
          <div className="admin-banner__title">Admin Privileged Environment</div>
          <div className="admin-banner__desc">
            Full visibility into production logs and user attribution. Caution: Changes are live.
          </div>
        </div>
      </div>

      <div className="admin-banner__status">
        System status: <span className="admin-banner__statusGood">Healthy</span>
      </div>
    </div>
  );
}