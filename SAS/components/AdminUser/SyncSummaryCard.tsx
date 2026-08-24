'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import '@/styles/AdminStyles/SyncSummaryCard.css';

type SyncStatus = 'success' | 'failed' | 'partial';

interface SyncLog {
  id: string;
  synced_at: string;
  status: SyncStatus;
  records_updated: number;
  error_count: number;
}

const FLASK_API = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5001';

export default function SyncSummaryCard() {
  const router = useRouter();
  const [latestSync, setLatestSync] = useState<SyncLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchLatestSync = useCallback(async () => {
    try {
      setLoadError(null);
      const response = await fetch(`${FLASK_API}/api/sync/logs`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      const logs = Array.isArray(result.data) ? result.data : [];
      setLatestSync(logs[0] ?? null);
    } catch (error) {
      console.error('Failed to load sync summary:', error);
      setLoadError('Could not load sync status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLatestSync();

    const handleFocus = () => fetchLatestSync();
    window.addEventListener('focus', handleFocus);

    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchLatestSync]);

  const syncData = {
    lastSyncTime: latestSync?.synced_at ?? '',
    status: (latestSync?.status ?? 'success') as SyncStatus,
    recordsUpdated: latestSync?.records_updated ?? 0,
    validationErrors: latestSync?.error_count ?? 0,
  };

  // Capitalize status for display
  const capitalizedStatus = syncData.status.charAt(0).toUpperCase() + syncData.status.slice(1) as 'Success' | 'Partial' | 'Failed';

  const statusColor: Record<'Success' | 'Partial' | 'Failed', string> = {
    Success: 'sync-status--green',
    Partial: 'sync-status--amber',
    Failed: 'sync-status--red',
  };

  const formatDateTime = (dt: string) => {
    if (!dt) return 'No sync yet';

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
      </div>

      {loadError && (
        <div className="sync-error">{loadError}</div>
      )}

      {/* STATS */}
      <div className="sync-stats">
        <div className="sync-stat">
          <Clock className="sync-stat__icon" />
          <div>
            <div className="sync-stat__label">Last Sync</div>
            <div className="sync-stat__value">
              {loading ? 'Loading...' : formatDateTime(syncData.lastSyncTime)}
            </div>
          </div>
        </div>

        <div className="sync-stat">
          <CheckCircle className="sync-stat__icon" />
          <div>
            <div className="sync-stat__label">Status</div>
            <span className={`sync-status ${statusColor[capitalizedStatus]}`}>
              {loading ? 'Loading' : capitalizedStatus}
            </span>
          </div>
        </div>

        <div className="sync-stat">
          <AlertTriangle className="sync-stat__icon" />
          <div>
            <div className="sync-stat__label">Errors</div>
            <div className="sync-stat__value">
              {loading ? '—' : syncData.validationErrors}
            </div>
          </div>
        </div>
      </div>

      {/* RECORDS */}
      <div className="sync-records">
        <div className="sync-records__label">Records Updated</div>
        <div className="sync-records__value">
          {loading ? '—' : syncData.recordsUpdated.toLocaleString()}
        </div>
      </div>

      {/* FOOTER */}
      <div className="sync-footer">
        {syncData.validationErrors > 0 && (
          <div className="sync-warning">
            <AlertTriangle className="sync-warning__icon" />
            {syncData.validationErrors} validation errors found
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
