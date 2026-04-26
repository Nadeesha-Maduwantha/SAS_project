'use client'

import { useState, Fragment, useEffect } from 'react'
import {
  RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Clock, Database, Activity, Bell, Calendar,
  ChevronDown, ChevronUp, X
} from 'lucide-react'

// ─── Types ───
type SyncStatus = 'success' | 'failed' | 'partial'
type HistoryFilter = 'all' | 'success' | 'failed' | 'partial'

// ─── Helpers ───
function formatDateTime(dt: string) {
  return new Date(dt).toLocaleString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatDuration(seconds: number) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

function StatusBadge({ status }: { status: SyncStatus }) {
  const config = {
    success: { label: 'Success', bg: '#dcfce7', color: '#16a34a', icon: <CheckCircle style={{ width: '12px', height: '12px' }} /> },
    failed: { label: 'Failed', bg: '#fee2e2', color: '#dc2626', icon: <XCircle style={{ width: '12px', height: '12px' }} /> },
    partial: { label: 'Partial', bg: '#fef9c3', color: '#ca8a04', icon: <AlertTriangle style={{ width: '12px', height: '12px' }} /> },
  }[status] ?? { label: status, bg: '#f3f4f6', color: '#6b7280', icon: null }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '9999px',
      background: config.bg, color: config.color,
      fontSize: '12px', fontWeight: 600,
    }}>
      {config.icon} {config.label}
    </span>
  )
}

// ─── Main Page ───
export default function SyncManagementPage() {
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all')
  const [historyPage, setHistoryPage] = useState(1)
  const [errorsPage, setErrorsPage] = useState(1)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [scheduleTime, setScheduleTime] = useState('08:00')
  const [customScheduleTime, setCustomScheduleTime] = useState<string | null>(null)
  const [alertOnFailure, setAlertOnFailure] = useState(true)
  const [alertOnValidation, setAlertOnValidation] = useState(true)
  const [minErrors, setMinErrors] = useState(1)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [scheduleSaved, setScheduleSaved] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [syncHistory, setSyncHistory] = useState<any[]>([])
  const [syncErrors, setSyncErrors] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  const now = new Date()
  const errorsPageSize = 5
  const historyPageSize = 10

  useEffect(() => {
    fetchSyncLogs()
    fetchSyncErrors()
    fetchSchedule()
  }, [])

  async function fetchSyncLogs() {
    try {
      setLoadingHistory(true)
      const response = await fetch('http://localhost:5000/api/sync/logs')
      const result = await response.json()
      if (result.data) setSyncHistory(result.data)
    } catch (error) {
      console.error('Failed to fetch sync logs:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  async function fetchSyncErrors() {
    try {
      const response = await fetch('http://localhost:5000/api/sync/errors')
      const result = await response.json()
      if (result.data) {
        const errors = Array.isArray(result.data) ? result.data : [result.data]
        setSyncErrors(errors)
      }
    } catch (error) {
      console.error('Failed to fetch sync errors:', error)
    }
  }

  async function fetchSchedule() {
    try {
      const response = await fetch('http://localhost:5000/api/sync/schedule')
      const result = await response.json()
      if (result.data) {
        const hours = result.data.schedule_hours
        const minute = result.data.schedule_minute
        // Only show custom time if it's not the default fixed schedule
        if (hours !== '0,6,12,18') {
          const formattedTime = `${String(hours).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
          setScheduleTime(formattedTime)
          setCustomScheduleTime(formattedTime)
        }
      }
    } catch (error) {
      console.error('Failed to fetch schedule:', error)
    }
  }

  async function handleSyncNow() {
    if (isSyncing) return
    setIsSyncing(true)
    setSyncProgress(0)

    const interval = setInterval(() => {
      setSyncProgress((prev) => {
        if (prev >= 90) { clearInterval(interval); return 90 }
        return prev + 5
      })
    }, 150)

    try {
      const response = await fetch('http://localhost:5000/api/sync')
      const result = await response.json()
      clearInterval(interval)
      setSyncProgress(100)
      setSyncResult(result)
      await fetchSyncLogs()
      await fetchSyncErrors()
    } catch (error) {
      clearInterval(interval)
      setSyncProgress(0)
    } finally {
      setIsSyncing(false)
    }
  }

  function handleSaveSettings() {
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  async function handleSaveSchedule() {
    try {
      const response = await fetch('http://localhost:5000/api/sync/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_time: scheduleTime })
      })
      const result = await response.json()
      if (result.success) {
        setCustomScheduleTime(scheduleTime)
        setScheduleSaved(true)
        setTimeout(() => setScheduleSaved(false), 2000)
      }
    } catch (error) {
      console.error('Failed to save schedule:', error)
    }
  }

  const latestSync = syncHistory[0]
  const lastSyncTime = latestSync?.synced_at ?? ''
  const lastSyncStatus = (latestSync?.status ?? 'success') as SyncStatus
  const lastRecordsUpdated = latestSync?.records_updated ?? 0
  const lastErrorCount = latestSync?.error_count ?? 0

  const filteredHistory = syncHistory.filter((h) => {
    if (historyFilter === 'all') return true
    return h.status === historyFilter
  })

  const paginatedHistory = filteredHistory.slice(
    (historyPage - 1) * historyPageSize,
    historyPage * historyPageSize
  )

  const paginatedErrors = syncErrors.slice(
    (errorsPage - 1) * errorsPageSize,
    errorsPage * errorsPageSize
  )

  const bannerConfig = lastSyncTime ? {
    success: { bg: '#f0fdf4', border: '#86efac', color: '#15803d', icon: <CheckCircle style={{ width: '18px', height: '18px' }} />, text: 'Last sync completed successfully on ' + formatDateTime(lastSyncTime) },
    failed: { bg: '#fef2f2', border: '#fca5a5', color: '#dc2626', icon: <XCircle style={{ width: '18px', height: '18px' }} />, text: 'Last sync failed on ' + formatDateTime(lastSyncTime) },
    partial: { bg: '#fefce8', border: '#fde047', color: '#a16207', icon: <AlertTriangle style={{ width: '18px', height: '18px' }} />, text: 'Last sync completed with ' + lastErrorCount + ' errors on ' + formatDateTime(lastSyncTime) },
  }[lastSyncStatus] : null

  return (
    <div className="p-6" style={{ maxWidth: '1400px' }}>

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sync Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor CargoWise data synchronization</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Last refreshed at {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 18px', fontSize: '13px', fontWeight: 600,
              color: 'white',
              background: isSyncing ? '#93c5fd' : '#2563eb',
              border: 'none', borderRadius: '8px',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <RefreshCw style={{ width: '14px', height: '14px', animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* ── Sync Progress ── */}
      {isSyncing && (
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: '10px', padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px'
        }}>
          <Activity style={{ width: '18px', height: '18px', color: '#2563eb', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af' }}>Sync in progress...</span>
              <span style={{ fontSize: '12px', color: '#3b82f6' }}>{syncProgress}%</span>
            </div>
            <div style={{ height: '6px', background: '#bfdbfe', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${syncProgress}%`, background: '#2563eb', borderRadius: '9999px', transition: 'width 0.15s' }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Sync Result ── */}
      {syncResult && !isSyncing && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #86efac',
          borderRadius: '10px', padding: '14px 20px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <CheckCircle style={{ width: '18px', height: '18px', color: '#16a34a', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#15803d' }}>
            Sync completed — {syncResult.inserted} inserted, {syncResult.updated} updated, {syncResult.errors} errors
          </span>
        </div>
      )}

      {/* ── Status Banner ── */}
      {!bannerDismissed && !isSyncing && bannerConfig && (
        <div style={{
          background: bannerConfig.bg,
          border: `1px solid ${bannerConfig.border}`,
          borderRadius: '10px', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: bannerConfig.color }}>{bannerConfig.icon}</span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: bannerConfig.color }}>
              {bannerConfig.text}
            </span>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: bannerConfig.color, padding: '2px' }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      )}

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Last Sync Time',
            value: lastSyncTime ? formatDateTime(lastSyncTime) : '—',
            icon: <Clock style={{ width: '18px', height: '18px' }} />,
            iconBg: '#eff6ff', iconColor: '#2563eb', small: true
          },
          {
            label: 'Sync Status',
            value: lastSyncTime ? <StatusBadge status={lastSyncStatus} /> : '—',
            icon: <Activity style={{ width: '18px', height: '18px' }} />,
            iconBg: '#f0fdf4', iconColor: '#16a34a', small: false
          },
          {
            label: 'Records Updated',
            value: lastRecordsUpdated.toLocaleString(),
            icon: <Database style={{ width: '18px', height: '18px' }} />,
            iconBg: '#eff6ff', iconColor: '#2563eb', small: false
          },
          {
            label: 'Validation Errors',
            value: lastErrorCount,
            icon: <AlertTriangle style={{ width: '18px', height: '18px' }} />,
            iconBg: lastErrorCount > 0 ? '#fef2f2' : '#f0fdf4',
            iconColor: lastErrorCount > 0 ? '#dc2626' : '#16a34a',
            small: false
          },
        ].map((card, i) => (
          <div key={i} style={{
            background: 'white', borderRadius: '12px',
            border: '1px solid #e5e7eb', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: card.iconBg, color: card.iconColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              {card.icon}
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {card.label}
              </p>
              {card.small ? (
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#111827', margin: 0 }}>{card.value}</p>
              ) : (
                <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>{card.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Two Column Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Validation Errors Table */}
          {syncErrors.length > 0 && (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>Validation Errors</h2>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '9999px' }}>
                  {syncErrors.length}
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      {['Shipment ID', 'Failed Field', 'Error Reason', 'Timestamp'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedErrors.map((err, i) => (
                      <tr key={i} style={{
                        borderBottom: '1px solid #f9fafb',
                        background: err.severity === 'critical' ? '#fff5f5' : '#fffbeb'
                      }}>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>#{err.job_number}</span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <code style={{ fontSize: '12px', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', color: '#374151' }}>
                            {err.field_name}
                          </code>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                              background: err.severity === 'critical' ? '#dc2626' : '#f59e0b'
                            }} />
                            <span style={{ fontSize: '13px', color: '#374151' }}>{err.error_reason}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {err.created_at ? formatDateTime(err.created_at) : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Errors Pagination */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                  Showing {((errorsPage - 1) * errorsPageSize) + 1}–{Math.min(errorsPage * errorsPageSize, syncErrors.length)} of {syncErrors.length}
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setErrorsPage((p) => Math.max(1, p - 1))}
                    disabled={errorsPage === 1}
                    style={{ padding: '5px 10px', fontSize: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: errorsPage === 1 ? 'not-allowed' : 'pointer', background: 'white', color: errorsPage === 1 ? '#d1d5db' : '#374151' }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setErrorsPage((p) => Math.min(Math.ceil(syncErrors.length / errorsPageSize), p + 1))}
                    disabled={errorsPage >= Math.ceil(syncErrors.length / errorsPageSize)}
                    style={{ padding: '5px 10px', fontSize: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', background: 'white', color: '#374151' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sync History Table */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>Sync History</h2>
              </div>
              <div style={{ display: 'flex', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                {(['all', 'success', 'failed', 'partial'] as HistoryFilter[]).map((f) => (
                  <button key={f} onClick={() => { setHistoryFilter(f); setHistoryPage(1) }} style={{
                    padding: '5px 12px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
                    background: historyFilter === f ? '#2563eb' : 'transparent',
                    color: historyFilter === f ? 'white' : '#6b7280',
                    textTransform: 'capitalize'
                  }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                    {['Date & Time', 'Status', 'Records Added', 'Records Updated', 'Errors', 'Duration', ''].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>
                        Loading sync history...
                      </td>
                    </tr>
                  ) : paginatedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>
                        No sync history found
                      </td>
                    </tr>
                  ) : paginatedHistory.map((row) => (
                    <Fragment key={row.id}>
                      <tr
                        onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                        style={{ borderBottom: '1px solid #f9fafb', cursor: 'pointer', background: expandedRow === row.id ? '#f8faff' : 'white' }}
                      >
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>
                          {row.synced_at ? formatDateTime(row.synced_at) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <StatusBadge status={row.status as SyncStatus} />
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', fontWeight: row.records_added > 0 ? 600 : 400 }}>
                          {row.records_added > 0 ? `+${row.records_added}` : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>
                          {row.records_updated > 0 ? row.records_updated : '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {row.error_count > 0 ? (
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '9999px' }}>
                              {row.error_count}
                            </span>
                          ) : (
                            <span style={{ fontSize: '13px', color: '#9ca3af' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                          {formatDuration(row.duration_seconds)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {expandedRow === row.id
                            ? <ChevronUp style={{ width: '14px', height: '14px', color: '#9ca3af' }} />
                            : <ChevronDown style={{ width: '14px', height: '14px', color: '#9ca3af' }} />
                          }
                        </td>
                      </tr>
                      {expandedRow === row.id && (
                        <tr key={`${row.id}-detail`}>
                          <td colSpan={7} style={{ padding: '0 16px 14px 16px', background: '#f8faff' }}>
                            <div style={{ padding: '10px 14px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                              <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
                                Sync {row.status} — {row.records_added} inserted, {row.records_updated} updated, {row.error_count} errors in {formatDuration(row.duration_seconds)}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* History Pagination */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                Showing {filteredHistory.length === 0 ? 0 : ((historyPage - 1) * historyPageSize) + 1}–{Math.min(historyPage * historyPageSize, filteredHistory.length)} of {filteredHistory.length}
              </p>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  style={{ padding: '5px 10px', fontSize: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: historyPage === 1 ? 'not-allowed' : 'pointer', background: 'white', color: historyPage === 1 ? '#d1d5db' : '#374151' }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setHistoryPage((p) => Math.min(Math.ceil(filteredHistory.length / historyPageSize), p + 1))}
                  disabled={historyPage >= Math.ceil(filteredHistory.length / historyPageSize)}
                  style={{ padding: '5px 10px', fontSize: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', background: 'white', color: '#374151' }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Sync Schedule */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Calendar style={{ width: '16px', height: '16px', color: '#6b7280' }} />
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>Sync Schedule</h2>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 2px' }}>Fixed Schedule</p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: 0 }}>Auto sync at 6AM, 12PM, 6PM, 12AM</p>
            </div>

            {customScheduleTime && (
              <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', color: '#3b82f6', margin: '0 0 2px' }}>Custom Schedule</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1d4ed8', margin: 0 }}>Also syncs at {customScheduleTime} Sri Lanka time</p>
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '6px' }}>
                Add Custom Sync Time
              </label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', fontSize: '13px',
                  border: '1px solid #d1d5db', borderRadius: '8px',
                  color: '#374151', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              onClick={handleSaveSchedule}
              style={{
                width: '100%', padding: '8px', fontSize: '13px', fontWeight: 600,
                color: 'white', background: scheduleSaved ? '#16a34a' : '#2563eb',
                border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s'
              }}
            >
              {scheduleSaved ? '✓ Saved' : 'Save Schedule'}
            </button>
          </div>

          {/* Alert Settings */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Bell style={{ width: '16px', height: '16px', color: '#6b7280' }} />
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>Alert Settings</h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#111827', margin: '0 0 2px' }}>Sync failure alert</p>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>Email admin on sync failure</p>
              </div>
              <button
                onClick={() => setAlertOnFailure(!alertOnFailure)}
                style={{
                  width: '44px', height: '24px', borderRadius: '9999px', border: 'none',
                  background: alertOnFailure ? '#2563eb' : '#d1d5db',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0
                }}
              >
                <span style={{
                  position: 'absolute', top: '2px',
                  left: alertOnFailure ? '22px' : '2px',
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: 'white', transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#111827', margin: '0 0 2px' }}>Validation error alert</p>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>Email admin on data errors</p>
              </div>
              <button
                onClick={() => setAlertOnValidation(!alertOnValidation)}
                style={{
                  width: '44px', height: '24px', borderRadius: '9999px', border: 'none',
                  background: alertOnValidation ? '#2563eb' : '#d1d5db',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0
                }}
              >
                <span style={{
                  position: 'absolute', top: '2px',
                  left: alertOnValidation ? '22px' : '2px',
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: 'white', transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '6px' }}>
                Minimum errors before alert
              </label>
              <input
                type="number"
                min={1}
                value={minErrors}
                onChange={(e) => setMinErrors(Number(e.target.value))}
                style={{
                  width: '100%', padding: '8px 12px', fontSize: '13px',
                  border: '1px solid #d1d5db', borderRadius: '8px',
                  color: '#374151', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              onClick={handleSaveSettings}
              style={{
                width: '100%', padding: '8px', fontSize: '13px', fontWeight: 600,
                color: 'white', background: settingsSaved ? '#16a34a' : '#2563eb',
                border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s'
              }}
            >
              {settingsSaved ? '✓ Saved' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}