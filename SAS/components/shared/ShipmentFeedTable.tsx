'use client';

// =============================================================
//  ShipmentFeedTable.tsx
//  Path: components/shared/ShipmentFeedTable.tsx
//
//  Dashboard preview of the shipments page table — same columns,
//  same data source, same ordering, just the first few rows.
//
//  Filtered to the signed-in user by email: getShipmentsByOperationUser()
//  resolves it against shipment_milestones.assigned_email, which is where
//  an operation user's ownership actually lives.
// =============================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getShipmentsByOperationUser } from '@/lib/services/shipment.service';
import { useAuth } from '@/lib/hooks/useAuth';
import type { Shipment } from '@/types';
import '@/styles/AdminStyles/FeedTable.css';

function formatPickupDate(date: string | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
  });
}

/** Map a pickup status onto one of the shared pill colours. */
function pickupPillClass(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === 'delayed')   return 'feed-pill feed-pill--danger';
  if (s === 'on time')   return 'feed-pill feed-pill--success';
  if (s === 'completed') return 'feed-pill feed-pill--accent';
  if (s === 'pending')   return 'feed-pill feed-pill--warning';
  return 'feed-pill feed-pill--neutral';
}

export default function ShipmentFeedTable({
  title = 'Shipment Feed',
  subtitle = 'Most recent shipments assigned to you',
  maxRows = 5,
  viewAllHref,
}: {
  title?:       string;
  subtitle?:    string;
  maxRows?:     number;
  viewAllHref?: string;
}) {
  const router = useRouter();
  const { email } = useAuth();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getShipmentsByOperationUser(email)
      .then(data => {
        // Same ordering as the full shipments page: nearest pickup date first,
        // shipments with no date last. Slice after sorting, so these really are
        // the next 5 rather than the first 5 the API happened to return.
        const sorted = [...(data ?? [])].sort((a, b) => {
          if (!a.llmCargoPickupDate) return 1;
          if (!b.llmCargoPickupDate) return -1;
          return new Date(a.llmCargoPickupDate).getTime() - new Date(b.llmCargoPickupDate).getTime();
        });
        if (!cancelled) setShipments(sorted.slice(0, maxRows));
      })
      .catch(err => {
        console.error('Failed to load shipment feed:', err);
        if (!cancelled) setError('Could not load shipments');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [email, maxRows]);

  return (
    <div className="feed-card">
      <div className="feed-card__head">
        <div>
          <h2 className="feed-card__title">{title}</h2>
          <div className="feed-card__sub">{subtitle}</div>
        </div>

        {viewAllHref && (
          <button className="feed-card__link" onClick={() => router.push(viewAllHref)}>
            View all
          </button>
        )}
      </div>

      <div className="feed-tableWrap">
        <table className="feed-table">
          <thead>
            <tr>
              <th>Shipment ID</th>
              <th>Consignee</th>
              <th>Status</th>
              <th>Transport Mode</th>
              <th>Pickup Date</th>
              <th>Pickup Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="feed-empty">Loading…</td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="feed-empty">{error}</td></tr>
            ) : shipments.length === 0 ? (
              <tr><td colSpan={6} className="feed-empty">No shipments found</td></tr>
            ) : shipments.map(shipment => (
              <tr
                key={shipment.id}
                onClick={() => viewAllHref && router.push(viewAllHref)}
              >
                <td>
                  <div className="feed-id">{shipment.cargowiseId ?? '—'}</div>
                  {shipment.branch && (
                    <div className="feed-sub">Branch: {shipment.branch}</div>
                  )}
                </td>

                <td>
                  <div className="feed-strong">{shipment.consigneeName ?? '—'}</div>
                  {shipment.gcCode && <div className="feed-sub">{shipment.gcCode}</div>}
                </td>

                <td className="feed-muted">
                  {shipment.llmIdentifiedType ?? shipment.currentStage ?? '—'}
                </td>

                <td>
                  {shipment.transportMode ? (
                    <span className="feed-pill feed-pill--accent">{shipment.transportMode}</span>
                  ) : (
                    <span className="feed-muted">—</span>
                  )}
                </td>

                <td className="feed-muted">{formatPickupDate(shipment.llmCargoPickupDate)}</td>

                <td>
                  {shipment.pickupDateStatus ? (
                    <span className={pickupPillClass(shipment.pickupDateStatus)}>
                      {shipment.pickupDateStatus}
                    </span>
                  ) : (
                    <span className="feed-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
