'use client';

import { RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import '@/styles/AdminStyles/SyncSummaryCard.css';

export default function SyncSummaryCard() {
  const router = useRouter();

  type SyncStatus = 'Success' | 'Partial' | 'Failed';

  // 🔹 TEMP DATA (later connect backend)
  const syncData: { lastSync: string; status: SyncStatus; records: number; errors: number; } = {
    lastSync: 'Feb 22, 2026, 08:00 AM',
    status: 'Partial',
    records: 142,
    errors: 3,
  };

  const statusColor: Record<SyncStatus, string> = {
    Success: 'sync-status--green',
    Partial: 'sync-status--amber',
    Failed: 'sync-status--red',
  };

  return (
    <div className="sync-card">
      {/* HEADER */}
      <div className="sync-card__head">
        <div className="sync-card__title">Sync Status</div>

        <button className="sync-btn">
          <RefreshCw className="sync-btn__icon" />
          Sync Now
        </button>
      </div>

      {/* STATS */}
      <div className="sync-stats">
        <div className="sync-stat">
          <Clock className="sync-stat__icon" />
          <div>
            <div className="sync-stat__label">Last Sync</div>
            <div className="sync-stat__value">{syncData.lastSync}</div>
          </div>
        </div>

        <div className="sync-stat">
          <CheckCircle className="sync-stat__icon" />
          <div>
            <div className="sync-stat__label">Status</div>
            <span className={`sync-status ${statusColor[syncData.status]}`}>
              {syncData.status}
            </span>
          </div>
        </div>

        <div className="sync-stat">
          <AlertTriangle className="sync-stat__icon" />
          <div>
            <div className="sync-stat__label">Errors</div>
            <div className="sync-stat__value">{syncData.errors}</div>
          </div>
        </div>
      </div>

      {/* RECORDS */}
      <div className="sync-records">
        <div className="sync-records__label">Records Updated</div>
        <div className="sync-records__value">{syncData.records}</div>
      </div>

      {/* FOOTER */}
      <div className="sync-footer">
        {syncData.errors > 0 && (
          <div className="sync-warning">
            ⚠ {syncData.errors} validation errors found
          </div>
        )}

        <button
          className="sync-view"
          onClick={() => router.push('/admin/sync')}
        >
          View Details →
        </button>
      </div>
    </div>
  );
}