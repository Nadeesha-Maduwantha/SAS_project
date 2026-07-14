'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Mail, AlertTriangle, MapPin } from 'lucide-react';
import EmailComposeModal from '@/components/EmailComposeModal';

interface Milestone {
  id: string; sequence_order: number; name: string; status: string;
  is_critical: boolean; automated: boolean; due_date: string | null;
  completed_date: string | null; notes: string | null; assigned_to: string | null;
  assigned_email: string | null; location_label: string | null;
  location_lat: number | null; location_lng: number | null;
  days_from_booking: number | null;
}
interface Shipment {
  id: string; job_number: string; consignee_name: string; transport_mode: string;
  branch: string | null; house_bill_number: string | null; origin_city: string | null;
  origin_country_code: string | null; destination_city: string | null;
  destination_country_code: string | null;
  milestones: Record<string, { date: string | null; status: string | null }> | null;
  created_by_name: string | null; created_by_email: string | null;
  consignee_email: string | null; st_note_text: string | null; carrier: string | null;
}
interface Props {
  isOpen: boolean; onClose: () => void; shipmentId: string | null;
  apiBase?: string; onMilestoneClick?: (m: Milestone, s: Shipment) => void;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { Authorization: `Bearer ${t}` };
}
const SS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  completed: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0', dot: '#10B981' },
  overdue:   { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA', dot: '#EF4444' },
  pending:   { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB', dot: '#9CA3AF' },
  current:   { bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6' },
};
const gs = (s: string) => SS[s?.toLowerCase()] || SS.pending;

// ── Compact location-only map ─────────────────────────────────────────────────
function MilestoneLocationMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const cRef   = useRef<HTMLDivElement>(null);
  const mapR   = useRef<any>(null);
  const markR  = useRef<any>(null);

  useEffect(() => {
    if (!cRef.current || mapR.current) return;
    const el = cRef.current as any;
    if (el._leaflet_id) el._leaflet_id = null;

    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css') as any])
      .then(([{ default: L }]) => {
        if (mapR.current) return;
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
        const map = L.map(cRef.current!, {
          center: [lat || 20, lng || 80], zoom: 5,
          zoomControl: true, attributionControl: false, scrollWheelZoom: false,
        });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:16px;height:16px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.35),0 2px 8px rgba(0,0,0,0.4);"></div>`,
          iconSize: [16, 16], iconAnchor: [8, 8],
        });
        markR.current = L.marker([lat, lng], { icon }).addTo(map)
          .bindTooltip(`<div style="font-size:11px;font-weight:600;color:#0F172A;">${label}</div>`,
            { direction: 'top', offset: [0, -10], opacity: 1 }).openTooltip();
        mapR.current = map;
      });
    return () => {
      if (mapR.current) { mapR.current.remove(); mapR.current = null; }
      const el = cRef.current as any;
      if (el) delete el._leaflet_id;
      markR.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapR.current || !markR.current) return;
    mapR.current.flyTo([lat, lng], 5, { duration: 0.9, easeLinearity: 0.4 });
    markR.current.setLatLng([lat, lng]);
  }, [lat, lng]);

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 10, overflow: 'hidden', border: '1px solid #1E293B' }}>
      <style>{`
        .leaflet-control-zoom a{background:#1e293b!important;color:#94a3b8!important;border-color:#334155!important;}
        .leaflet-control-zoom a:hover{background:#334155!important;color:white!important;}
      `}</style>
      <div ref={cRef} style={{ width: '100%', height: 180 }} />
      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'8px 12px', background:'linear-gradient(to top,rgba(15,23,42,0.85) 0%,transparent 100%)', display:'flex', alignItems:'center', gap:6, pointerEvents:'none' }}>
        <MapPin size={12} color="#94A3B8" />
        <span style={{ fontSize:11, fontWeight:600, color:'#E2E8F0' }}>{label}</span>
        <span style={{ marginLeft:'auto', fontFamily:'monospace', fontSize:10, color:'#64748B' }}>
          {lat.toFixed(3)}°, {lng.toFixed(3)}°
        </span>
      </div>
    </div>
  );
}

function NoLocationPlaceholder() {
  return (
    <div style={{ height:90, borderRadius:10, background:'#0F172A', border:'1px solid #1E293B', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}>
      <MapPin size={16} color="#334155" />
      <span style={{ fontSize:11, color:'#475569', fontWeight:500 }}>No location data for this milestone</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ShipmentMilestonesModal({ isOpen, onClose, shipmentId, apiBase='http://localhost:5000', onMilestoneClick }: Props) {
  const [shipment,     setShipment]     = useState<Shipment | null>(null);
  const [milestones,   setMilestones]   = useState<Milestone[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [emailData,    setEmailData]    = useState<any>(null);

  useEffect(() => {
    if (!isOpen || !shipmentId) return;
    setLoading(true); setError(null); setCurrentIndex(0);
    fetch(`${apiBase}/api/shipments/${shipmentId}`, { headers: authHeaders() })
      .then(r => r.json()).then(res => {
        if (res.error) throw new Error(res.error);
        setShipment(res.data.shipment);
        setMilestones(res.data.milestones || []);
      }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [isOpen, shipmentId, apiBase]);

  useEffect(() => {
    if (!isOpen) { setShipment(null); setMilestones([]); setCurrentIndex(0); setError(null); }
  }, [isOpen]);

  if (!isOpen) return null;

  const m      = milestones[currentIndex] || null;
  const ms     = m ? gs(m.status) : SS.pending;
  const hasMap = m && m.location_lat && m.location_lng;
  const goTo   = (i: number) => { if (i >= 0 && i < milestones.length) setCurrentIndex(i); };

  const buildEmail = () => !m || !shipment ? null : ({
    id: shipment.job_number, shipment_id: shipment.id, client: shipment.consignee_name,
    priority: m.is_critical ? 'Critical' : 'Medium', milestone: m.name, milestoneIcon: null,
    issue: m.notes || `Milestone "${m.name}" requires attention.`,
    delay: fmtDate(m.due_date), delayColor: m.status === 'overdue' ? '#DC2626' : '#D97706',
    status: 'Get Action' as const,
  });

  return (
    <>
      <style>{`
        @keyframes smIn { from{opacity:0;transform:scale(0.96) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes spin  { to{transform:rotate(360deg)} }
      `}</style>

      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:860, background:'#fff', borderRadius:16, boxShadow:'0 24px 60px rgba(0,0,0,0.22)', overflow:'hidden', animation:'smIn 0.22s cubic-bezier(0.22,0.61,0.36,1)', display:'flex', flexDirection:'column', maxHeight:'90vh' }}>

          {/* Header */}
          <div style={{ padding:'15px 22px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#FAFAFA', flexShrink:0 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ fontFamily:'monospace', fontSize:16, fontWeight:800, color:'#1D4ED8' }}>#{shipment?.job_number || '…'}</span>
                {shipment?.transport_mode && <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:99, background:'#DBEAFE', color:'#1D4ED8', border:'1px solid #BFDBFE' }}>{shipment.transport_mode}</span>}
                {shipment?.milestones?.cargo_pickup?.status && (
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:99, background: shipment.milestones.cargo_pickup.status==='Delayed'?'#FEE2E2':'#D1FAE5', color: shipment.milestones.cargo_pickup.status==='Delayed'?'#B91C1C':'#065F46', border: shipment.milestones.cargo_pickup.status==='Delayed'?'1px solid #FECACA':'1px solid #A7F3D0' }}>
                    {shipment.milestones.cargo_pickup.status}
                  </span>
                )}
              </div>
              <p style={{ fontSize:12, color:'#6B7280', margin:0 }}>
                {shipment?.consignee_name || '—'}{shipment?.origin_city && shipment?.destination_city ? ` · ${shipment.origin_city} → ${shipment.destination_city}` : ''}
              </p>
            </div>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:'50%', border:'1px solid #E5E7EB', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#6B7280' }}>
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          {loading ? (
            <div style={{ padding:'60px 24px', textAlign:'center', color:'#9CA3AF', fontSize:14 }}>
              <div style={{ width:20, height:20, borderRadius:'50%', border:'2px solid #E5E7EB', borderTopColor:'#3B82F6', animation:'spin 0.7s linear infinite', margin:'0 auto 12px' }} />
              Loading shipment data…
            </div>
          ) : error ? (
            <div style={{ padding:'40px 24px', textAlign:'center', color:'#DC2626', fontSize:13 }}>⚠ {error}</div>
          ) : (
            <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>

              {/* Sidebar */}
              <div style={{ width:205, flexShrink:0, borderRight:'1px solid #F3F4F6', overflowY:'auto', padding:'10px 8px', background:'#FAFAFA' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.07em', padding:'0 6px 8px' }}>
                  Milestones ({milestones.length})
                </p>
                {milestones.map((mi, i) => {
                  const s = gs(mi.status);
                  const active = i === currentIndex;
                  return (
                    <button key={mi.id} onClick={() => setCurrentIndex(i)} style={{ width:'100%', textAlign:'left', padding:'8px 10px', borderRadius:8, marginBottom:3, border: active?`1px solid ${s.border}`:'1px solid transparent', background: active?s.bg:'transparent', cursor:'pointer', display:'flex', alignItems:'center', gap:7, transition:'all 0.12s' }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background='#F3F4F6'; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background='transparent'; }}
                    >
                      <span style={{ width:20, height:20, borderRadius:5, flexShrink:0, background: active?s.dot:'#E5E7EB', color: active?'#fff':'#9CA3AF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800 }}>
                        {mi.sequence_order + 1}
                      </span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p onClick={e => { e.stopPropagation(); if (onMilestoneClick && shipment) onMilestoneClick(mi, shipment); }}
                          style={{ fontSize:11, fontWeight: active?700:500, color: active?s.text:'#374151', margin:0, lineHeight:1.3, textDecoration:'underline', textDecorationStyle:'dotted', textDecorationColor:'#D1D5DB', cursor:'pointer' }}
                          title="View full milestone detail">
                          {mi.name}
                        </p>
                        <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:2 }}>
                          <span style={{ width:5, height:5, borderRadius:'50%', background:s.dot, flexShrink:0 }} />
                          <span style={{ fontSize:10, color:'#9CA3AF' }}>{mi.status}</span>
                          {mi.is_critical && <span style={{ fontSize:9, fontWeight:700, color:'#DC2626' }}>· CRIT</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Detail panel */}
              <div style={{ flex:1, overflowY:'auto', padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>
                {!m ? (
                  <p style={{ color:'#9CA3AF', fontSize:13, textAlign:'center', marginTop:40 }}>No milestones found.</p>
                ) : (
                  <>
                    {/* Title row */}
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                      <div>
                        <h3 onClick={() => onMilestoneClick && shipment && onMilestoneClick(m, shipment)}
                          style={{ fontSize:15, fontWeight:700, color:'#111827', margin:'0 0 6px', cursor: onMilestoneClick?'pointer':'default', textDecoration: onMilestoneClick?'underline':'none', textDecorationStyle:'dotted', textDecorationColor:'#9CA3AF' }}
                          title="Click for full detail">
                          {m.name}
                        </h3>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:99, background:ms.bg, color:ms.text, border:`1px solid ${ms.border}` }}>{m.status}</span>
                          {m.is_critical && <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:4, background:'#FEE2E2', color:'#B91C1C', border:'1px solid #FECACA', display:'inline-flex', alignItems:'center', gap:3 }}><AlertTriangle size={9} /> CRITICAL</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                        <button onClick={() => goTo(currentIndex-1)} disabled={currentIndex===0} style={{ width:28, height:28, borderRadius:7, border:'1px solid #E5E7EB', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor: currentIndex===0?'not-allowed':'pointer', color: currentIndex===0?'#D1D5DB':'#374151' }}><ChevronLeft size={13}/></button>
                        <span style={{ fontSize:11, color:'#9CA3AF', whiteSpace:'nowrap' }}>{currentIndex+1}/{milestones.length}</span>
                        <button onClick={() => goTo(currentIndex+1)} disabled={currentIndex===milestones.length-1} style={{ width:28, height:28, borderRadius:7, border:'1px solid #E5E7EB', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor: currentIndex===milestones.length-1?'not-allowed':'pointer', color: currentIndex===milestones.length-1?'#D1D5DB':'#374151' }}><ChevronRight size={13}/></button>
                      </div>
                    </div>

                    {/* MAP — location only */}
                    {hasMap
                      ? <MilestoneLocationMap lat={m.location_lat!} lng={m.location_lng!} label={m.location_label||'Milestone location'} />
                      : <NoLocationPlaceholder />
                    }

                    {/* Date grid */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      {[
                        { label:'Expected Date',     value: fmtDate(m.due_date)        },
                        { label:'Completed At',      value: fmtDate(m.completed_date)  },
                        { label:'Days from Booking', value: m.days_from_booking!=null?`Day ${m.days_from_booking}`:'—' },
                        { label:'Assigned To',       value: m.assigned_to||'—'         },
                      ].map(it => (
                        <div key={it.label} style={{ padding:'10px 13px', background:'#F9FAFB', border:'1px solid #F3F4F6', borderRadius:9 }}>
                          <p style={{ fontSize:10, fontWeight:600, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 3px' }}>{it.label}</p>
                          <p style={{ fontSize:13, fontWeight:600, color:'#111827', margin:0 }}>{it.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Notes */}
                    {m.notes && (
                      <div style={{ padding:'11px 14px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:9 }}>
                        <p style={{ fontSize:10, fontWeight:700, color:'#92400E', textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 5px' }}>Notes</p>
                        <p style={{ fontSize:13, color:'#78350F', margin:0, lineHeight:1.65 }}>{m.notes}</p>
                      </div>
                    )}

                    {/* Send alert */}
                    {m.status !== 'completed' && (
                      <button onClick={() => setEmailData(buildEmail())}
                        style={{ display:'inline-flex', alignItems:'center', gap:7, alignSelf:'flex-start', padding:'9px 18px', borderRadius:9, fontSize:13, fontWeight:700, background: m.is_critical?'#DC2626':'#1D4ED8', color:'#fff', border:'none', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.12)', transition:'opacity 0.15s' }}
                        onMouseEnter={e=>(e.currentTarget.style.opacity='0.87')} onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
                        <Mail size={14}/>{m.is_critical?'Urgent — Send Alert':'Send Alert'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          {!loading && !error && milestones.length > 0 && (
            <div style={{ padding:'11px 22px', borderTop:'1px solid #F3F4F6', background:'#FAFAFA', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <button onClick={() => goTo(currentIndex-1)} disabled={currentIndex===0} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 13px', borderRadius:8, fontSize:12, fontWeight:600, border:'1px solid #E5E7EB', background:'#fff', color: currentIndex===0?'#D1D5DB':'#374151', cursor: currentIndex===0?'not-allowed':'pointer' }}>
                <ChevronLeft size={13}/> Prev Milestone
              </button>
              <span style={{ fontSize:11, color:'#9CA3AF' }}>Milestone {currentIndex+1} of {milestones.length}</span>
              <button onClick={() => goTo(currentIndex+1)} disabled={currentIndex===milestones.length-1} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 13px', borderRadius:8, fontSize:12, fontWeight:600, border:'1px solid #E5E7EB', background:'#fff', color: currentIndex===milestones.length-1?'#D1D5DB':'#374151', cursor: currentIndex===milestones.length-1?'not-allowed':'pointer' }}>
                Next Milestone <ChevronRight size={13}/>
              </button>
            </div>
          )}
        </div>
      </div>

      <EmailComposeModal isOpen={Boolean(emailData)} onClose={() => setEmailData(null)} alertData={emailData} />
    </>
  );
}