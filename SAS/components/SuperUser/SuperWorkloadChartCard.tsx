import '@/styles/SuperStyles/SuperWorkloadChartCard.css';

const days = [
  { d: 'MON', shipments: 60, tasks: 80 },
  { d: 'TUE', shipments: 85, tasks: 80 },
  { d: 'WED', shipments: 50, tasks: 80 },
  { d: 'THU', shipments: 70, tasks: 80 },
  { d: 'FRI', shipments: 90, tasks: 80 },
  { d: 'SAT', shipments: 35, tasks: 80 },
  { d: 'SUN', shipments: 25, tasks: 80 },
];

export default function SuperWorkloadChartCard() {
  return (
    <div className="wl-card">
      <div className="wl-card__head">
        <h2 className="wl-card__title">Team Workload Distribution</h2>

        <div className="wl-legend">
          <span className="wl-legend__item">
            <span className="wl-dot wl-dot--blue" /> Shipments
          </span>
          <span className="wl-legend__item">
            <span className="wl-dot wl-dot--gray" /> Tasks
          </span>
        </div>
      </div>

      <div className="wl-chart">
        {days.map((x) => (
          <div className="wl-col" key={x.d}>
            <div className="wl-bars">
              <div className="wl-bar wl-bar--task" style={{ height: `${x.tasks}%` }} />
              <div className="wl-bar wl-bar--ship" style={{ height: `${x.shipments}%` }} />
            </div>
            <div className="wl-day">{x.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}