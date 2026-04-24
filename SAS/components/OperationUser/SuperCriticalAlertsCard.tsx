import { AlertCircle, TriangleAlert, Info } from 'lucide-react';
import '@/styles/SuperStyles/SuperCriticalAlertsCard.css';

const alerts = [
  {
    tone: 'red',
    title: 'Shipment #AX-429 Delay',
    desc: 'Customs clearance pending for > 24h in Singapore.',
    icon: AlertCircle,
  },
  {
    tone: 'amber',
    title: 'Route Alteration Required',
    desc: 'Weather conditions affecting North Atlantic routes.',
    icon: TriangleAlert,
  },
  {
    tone: 'gray',
    title: 'New Compliance Update',
    desc: 'Revised EU transport regulations effective from Nov 1.',
    icon: Info,
  },
];

export default function SuperCriticalAlertsCard() {
  return (
    <div className="ca-card">
      <div className="ca-head">
        <h2 className="ca-title">Critical Alerts</h2>
        <button className="ca-link">View All</button>
      </div>

      <div className="ca-list">
        {alerts.map((a) => {
          const Icon = a.icon;
          return (
            <div key={a.title} className={`ca-item ca-item--${a.tone}`}>
              <div className="ca-item__icon">
                <Icon className="ca-item__iconSvg" />
              </div>
              <div>
                <div className="ca-item__t">{a.title}</div>
                <div className="ca-item__d">{a.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <button className="ca-mark">Mark All as Read</button>
    </div>
  );
}