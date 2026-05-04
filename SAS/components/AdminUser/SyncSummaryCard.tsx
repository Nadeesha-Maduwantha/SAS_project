'use client';

import { RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import '@/styles/AdminStyles/SyncSummaryCard.css';

type SyncStatus = 'success' | 'failed' | 'partial';

interface SyncSummaryCardProps {
  syncData: {
    lastSyncTime: string;
    status: SyncStatus;
    recordsUpdated: number;
    validationErrors: number;
  };
}

export default function SyncSummaryCard({ syncData }: SyncSummaryCardProps) {
  const router = useRouter();

  // Capitalize status for display
  const capitalizedStatus = syncData.status.charAt(0).toUpperCase() + syncData.status.slice(1) as 'Success' | 'Partial' | 'Failed';

  const statusColor: Record<'Success' | 'Partial' | 'Failed', string> = {
    Success: 'sync-status--green',
    Partial: 'sync-status--amber',
    Failed: 'sync-status--red',
  };

  const formatDateTime = (dt: string) => {
    return new Date(dt).toLocaleString('en-US', {
      month: 'short', day: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="sync-card">
      {/* HEADER */}
      <div className="sync-card__head">
        <div className="sync-card__title">Sync Status</div>

        {/* <button className="sync-btn">
          <RefreshCw className="sync-btn__icon" />
          Sync Now
        </button> */}
      </div>

      {/* STATS */}
      <div className="sync-stats">
        <div className="sync-stat">
          <Clock className="sync-stat__icon" />
          <div>
            <div className="sync-stat__label">Last Sync</div>
            <div className="sync-stat__value">{formatDateTime(syncData.lastSyncTime)}</div>
          </div>
        </div>

        <div className="sync-stat">
          <CheckCircle className="sync-stat__icon" />
          <div>
            <div className="sync-stat__label">Status</div>
            <span className={`sync-status ${statusColor[capitalizedStatus]}`}>
              {capitalizedStatus}
            </span>
          </div>
        </div>

        <div className="sync-stat">
          <AlertTriangle className="sync-stat__icon" />
          <div>
            <div className="sync-stat__label">Errors</div>
            <div className="sync-stat__value">{syncData.validationErrors}</div>
          </div>
        </div>
      </div>

      {/* RECORDS */}
      <div className="sync-records">
        <div className="sync-records__label">Records Updated</div>
        <div className="sync-records__value">{syncData.recordsUpdated}</div>
      </div>

      {/* FOOTER */}
      <div className="sync-footer">
        {syncData.validationErrors > 0 && (
          <div className="sync-warning">
            ⚠ {syncData.validationErrors} validation errors found
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