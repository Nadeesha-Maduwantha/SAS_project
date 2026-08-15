"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import MilestoneMap from "@/app/components/MilestoneMap";
import EmailComposeModal from "@/components/EmailComposeModal";

// ─── Role config ──────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  admin: {
    recipient:    (s) => ({
      name:    s.operationsUser?.name  ?? s.createdBy?.name  ?? s.created_by_name  ?? "Operations User",
      email:   s.operationsUser?.email ?? s.createdBy?.email ?? s.created_by_email ?? "",
      company: "Dart Global Logistics",
    }),
    buttonLabel:  (m) => m.critical ? "Urgent — Alert Operations" : "Alert Operations User",
    buttonColor:  (m) => m.critical ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700",
    modalTitle:   "Alert Operations User",
    modalSubtitle:(s) => `This email will be sent to the Operations user responsible for this shipment`,
    emailSubject: (m, s) => `${m.critical ? "[URGENT] " : ""}Action Required — ${m.name} — ${s.id ?? s.cargowise_id}`,
    emailBody:    (m, s) => {
      const name = s.operationsUser?.name ?? s.createdBy?.name ?? s.created_by_name ?? "Operations User";
      return `Dear ${name},\n\nThis is an alert from the Admin regarding Shipment ${s.id ?? s.cargowise_id}.\n\nMilestone "${m.name}" is currently ${m.status.toUpperCase()} — expected by ${m.date}.\n\nPlease take immediate action on this milestone${m.critical ? " — this is marked CRITICAL" : ""}.\n\nShipment: ${s.id ?? s.cargowise_id}\nMilestone: ${m.name}\nExpected Date: ${m.date}\nLocation: ${m.location?.label ?? "Unknown"}\n\nKindly update CargoWise once resolved.\n\nRegards,\nSAS Operation`;
    },
    confirmMsg:   (m, s) => {
      const name = s.operationsUser?.name ?? s.createdBy?.name ?? s.created_by_name ?? "Operations User";
      return `${name} has been notified to take action on milestone "${m.name}".`;
    },
  },
  superuser: {
    recipient:    (s) => ({
      name:    s.operationsUser?.name  ?? s.createdBy?.name  ?? s.created_by_name  ?? "Operations User",
      email:   s.operationsUser?.email ?? s.createdBy?.email ?? s.created_by_email ?? "",
      company: "Dart Global Logistics",
    }),
    buttonLabel:  (m) => m.critical ? "Urgent — Alert Operations" : "Alert Operations User",
    buttonColor:  (m) => m.critical ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700",
    modalTitle:   "Alert Operations User",
    modalSubtitle:(s) => `This email will be sent to the Operations user responsible for this shipment`,
    emailSubject: (m, s) => `${m.critical ? "[URGENT] " : ""}Action Required — ${m.name} — ${s.id ?? s.cargowise_id}`,
    emailBody:    (m, s) => {
      const name = s.operationsUser?.name ?? s.createdBy?.name ?? s.created_by_name ?? "Operations User";
      return `Dear ${name},\n\nThis is an alert from your Department Head regarding Shipment ${s.id ?? s.cargowise_id}.\n\nMilestone "${m.name}" is currently ${m.status.toUpperCase()} — expected by ${m.date}.\n\nPlease take action on this at the earliest${m.critical ? " — CRITICAL milestone" : ""}.\n\nShipment: ${s.id ?? s.cargowise_id}\nMilestone: ${m.name}\nExpected Date: ${m.date}\nLocation: ${m.location?.label ?? "Unknown"}\n\nUpdate CargoWise once complete.\n\nBest regards,\nDepartment Head`;
    },
    confirmMsg:   (m, s) => {
      const name = s.operationsUser?.name ?? s.createdBy?.name ?? s.created_by_name ?? "Operations User";
      return `${name} has been notified to take action on milestone "${m.name}".`;
    },
  },
  operations: {
    recipient:    (s) => ({
      name:    s.shiplineContact?.name    ?? s.lastUpdatedBy?.name  ?? s.updated_by_name  ?? "Shipline Contact",
      email:   s.shiplineContact?.email   ?? s.lastUpdatedBy?.email ?? s.updated_by_email ?? "",
      company: s.shiplineContact?.company ?? s.carrier              ?? "Shipline",
    }),
    buttonLabel:  (m) => m.critical ? "Urgent — Alert Shipline" : "Alert Shipline",
    buttonColor:  (m) => m.critical ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700",
    modalTitle:   "Alert Shipline Contact",
    modalSubtitle:(s) => `This email will be sent to ${s.shiplineContact?.company ?? s.carrier ?? "the shipline"} to update CargoWise`,
    emailSubject: (m, s) => `${m.critical ? "[URGENT] " : ""}CargoWise Update Required — ${m.name} — ${s.id ?? s.cargowise_id}`,
    emailBody:    (m, s) => {
      const contactName = s.shiplineContact?.name ?? "Shipline Contact";
      const fromName    = s.operationsUser?.name ?? s.createdBy?.name ?? s.created_by_name ?? "Operations Team";
      return `Dear ${contactName},\n\nI am writing regarding Shipment ${s.id ?? s.cargowise_id}.\n\nMilestone "${m.name}" is currently ${m.status.toUpperCase()} — expected by ${m.date}.\n\nPlease update CargoWise with the latest status for this milestone at your earliest convenience${m.critical ? " — this is a CRITICAL milestone requiring urgent attention" : ""}.\n\nShipment Reference: ${s.id ?? s.cargowise_id}\nMilestone: ${m.name}\nExpected Date: ${m.date}\nLocation: ${m.location?.label ?? "Unknown"}\n\nKindly confirm once CargoWise has been updated.\n\nBest regards,\n${fromName}\nDart Global Logistics`;
    },
    confirmMsg:   (m, s) => {
      const contactName = s.shiplineContact?.name ?? "Shipline Contact";
      const company     = s.shiplineContact?.company ?? s.carrier ?? "the shipline";
      return `${contactName} at ${company} has been notified to update CargoWise for milestone "${m.name}".`;
    },
  },
  sales: {
    recipient:    (s) => ({
      name:    s.clientContact?.name    ?? s.consignee_name ?? s.consigneeName ?? "Client",
      email:   s.clientContact?.email   ?? s.consignee_email ?? s.consigneeEmail ?? "",
      company: s.clientContact?.company ?? s.consignee_name ?? s.consigneeName ?? "Client Company",
    }),
    buttonLabel:  (m) => m.critical ? "Urgent — Contact Client" : "Contact Client",
    buttonColor:  (m) => m.critical ? "bg-red-600 hover:bg-red-700" : "bg-violet-600 hover:bg-violet-700",
    modalTitle:   "Contact Client",
    modalSubtitle:(s) => `This email will be sent to the client contact at ${s.clientContact?.company ?? s.consignee_name ?? "the client"}`,
    emailSubject: (m, s) => `${m.critical ? "[URGENT] " : ""}Shipment Update — ${s.id ?? s.cargowise_id} — ${m.name}`,
    emailBody:    (m, s) => {
      const clientName = s.clientContact?.name ?? s.consignee_name ?? s.consigneeName ?? "Client";
      const route = `${s.origin_city ?? s.originCity ?? "—"} → ${s.destination_city ?? s.destinationCity ?? "—"}`;
      return `Dear ${clientName},\n\nWe are writing to update you regarding your shipment ${s.id ?? s.cargowise_id}.\n\nWe wanted to inform you that the milestone "${m.name}" is currently ${m.status === "overdue" ? "delayed" : "in progress"} — originally expected by ${m.date}.\n\n${m.status === "overdue" ? "Our operations team is actively working to resolve this and we will keep you updated on progress." : "We are monitoring this closely and will notify you of any changes."}\n\nShipment Reference: ${s.id ?? s.cargowise_id}\nRoute: ${route}\nMilestone: ${m.name}\nExpected Date: ${m.date}\n\nPlease do not hesitate to contact us if you have any questions.\n\nKind regards,\nDart Global Logistics`;
    },
    confirmMsg:   (m, s) => {
      const clientName = s.clientContact?.name ?? s.consignee_name ?? s.consigneeName ?? "Client";
      const company    = s.clientContact?.company ?? s.consignee_name ?? "the client";
      return `${clientName} at ${company} has been notified about milestone "${m.name}".`;
    },
  },
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS = {
  completed: { label: "Completed", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  overdue:   { label: "Overdue",   bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     dot: "bg-red-500"     },
  pending:   { label: "Pending",   bg: "bg-gray-100",   text: "text-gray-500",    border: "border-gray-200",    dot: "bg-gray-400"    },
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const ChevronLeft  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevronRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const MailIcon     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const MapPinIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const UserIcon     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const CalendarIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const AlertIcon    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const CheckIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MilestonePage() {
  const searchParams = useSearchParams();

  const [shipment,       setShipment]       = useState(null);
  const [milestones,     setMilestones]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [currentIndex,   setCurrentIndex]   = useState(0);
  const [showEmail,      setShowEmail]      = useState(false);
  const [sentMilestones, setSentMilestones] = useState(new Set());

  const USER_ROLE = "operations"; // replace with real role from session later

  useEffect(() => {
    const shipmentId = searchParams.get("id") ?? "605ec73e-89d5-4d18-8721-5bd694bd9528";

    fetch(`http://localhost:5000/api/shipments/${shipmentId}`)
      .then(r => r.json())
      .then(result => {
        setShipment(result.data.shipment);
        const transformed = (result.data.milestones ?? []).map((m) => ({
          ...m,
          number:      m.sequence_order + 1,
          date:        m.due_date,
          completedAt: m.completed_date,
          critical:    m.is_critical,
          location: {
            label: m.location_label ?? "Unknown",
            lat:   m.location_lat   ?? 0,
            lng:   m.location_lng   ?? 0,
          },
        }));
        setMilestones(transformed);
      })
      .catch((err) => {
        console.error("Failed to load shipment:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading shipment...</p>
    </div>
  );

  if (!shipment) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-400 text-sm">Could not load shipment. Is Flask running?</p>
    </div>
  );

  if (!loading && milestones.length === 0) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">No milestones found for this shipment.</p>
    </div>
  );

  const milestone  = milestones[currentIndex];
  const status     = STATUS[milestone?.status] ?? STATUS.pending;
  const hasSent    = sentMilestones.has(milestone?.id);
  const roleConfig = ROLE_CONFIG[USER_ROLE] ?? ROLE_CONFIG["admin"];

  const goTo       = (i) => { if (i >= 0 && i < milestones.length) setCurrentIndex(i); };
  const handleSent = () => {
    setSentMilestones(prev => new Set([...prev, milestone.id]));
    setShowEmail(false);
  };

  // Build alertData for EmailComposeModal
  const alertData = milestone && shipment ? {
    id:       shipment.id ?? shipment.cargowise_id ?? "",
    client:   shipment.consignee_name ?? shipment.consigneeName ?? shipment.id ?? "",
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 flex" style={{ height: "100vh" }}>

      {/* ── Email Compose Modal ── */}
      <EmailComposeModal
        isOpen={showEmail}
        onClose={() => setShowEmail(false)}
        alertData={alertData}
      />

      {/* ════════ LEFT ════════ */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

        {/* Shipment strip */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Shipment</p>
            <p className="text-sm font-semibold text-gray-900 font-mono">{shipment.id ?? shipment.cargowise_id}</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Consignee</p>
            <p className="text-sm font-semibold text-gray-900">{shipment.consignee_name ?? shipment.consigneeName ?? "—"}</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Route</p>
            <p className="text-sm font-semibold text-gray-900">
              {shipment.origin_city ?? shipment.originCity ?? "—"} → {shipment.destination_city ?? shipment.destinationCity ?? "—"}
            </p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Type</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
              {shipment.transport_mode ?? shipment.transportMode ?? "—"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${status.bg} ${status.text} ${status.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            {milestone?.critical && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-600 text-white">
                <AlertIcon /> CRITICAL
              </span>
            )}
          </div>
        </div>

        {/* Map */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700">Milestone Location</h2>
            <span className="text-xs text-gray-400">Updates without page reload as you navigate</span>
          </div>
          <MilestoneMap milestone={milestone} allMilestones={milestones} currentIndex={currentIndex} />
        </div>

        {/* Milestone details */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">{milestone?.name}</h2>
            {milestone?.automated && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">Auto-updated</span>
            )}
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-5">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1.5 flex items-center gap-1.5"><CalendarIcon /> Expected Date</p>
              <p className="text-sm font-semibold text-gray-900">{milestone?.date}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1.5 flex items-center gap-1.5"><CheckIcon /> Completed At</p>
              <p className={`text-sm font-semibold ${milestone?.completedAt ? "text-emerald-700" : "text-gray-400"}`}>
                {milestone?.completedAt ?? "Not yet completed"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1.5 flex items-center gap-1.5"><MapPinIcon /> Location</p>
              <p className="text-sm font-semibold text-gray-900">{milestone?.location?.label}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1.5">Days from Booking</p>
              <p className="text-sm font-semibold text-gray-900">Day {milestone?.days_from_booking ?? milestone?.daysFromBooking ?? "—"}</p>
            </div>
          </div>
          {milestone?.notes && (
            <div className="px-5 pb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1.5">Notes</p>
              <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">{milestone.notes}</div>
            </div>
          )}
        </div>

        {/* Responsible parties */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Responsible Parties</h2>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0"><UserIcon /></div>
              <div>
                <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-0.5">Created By</p>
                <p className="text-sm font-semibold text-gray-900">{shipment.createdBy?.name ?? shipment.created_by_name ?? "—"}</p>
                <p className="text-xs text-blue-600 mt-1">{shipment.createdBy?.email ?? shipment.created_by_email ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0"><UserIcon /></div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Last Updated By</p>
                <p className="text-sm font-semibold text-gray-900">{shipment.lastUpdatedBy?.name ?? shipment.updated_by_name ?? "—"}</p>
                <p className="text-xs text-gray-500 mt-1">{shipment.lastUpdatedBy?.email ?? shipment.updated_by_email ?? "—"}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ════════ RIGHT — Sidebar ════════ */}
      <div className="w-72 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto flex flex-col">
        <div className="px-4 pt-5 pb-4 border-b border-gray-100">
          {milestone?.status !== "completed" ? (
            <button
              onClick={() => setShowEmail(true)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-colors ${milestone ? roleConfig.buttonColor(milestone) : "bg-gray-400"}`}
            >
              <MailIcon />
              {milestone ? roleConfig.buttonLabel(milestone) : "Loading..."}
            </button>
          ) : (
            <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckIcon /> Milestone Completed
            </div>
          )}
          {hasSent && <p className="text-xs text-emerald-600 text-center mt-2 font-medium">✓ Email sent successfully</p>}
          <div className="mt-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-400 text-center">
              Viewing as <span className="font-semibold text-gray-600 capitalize">{USER_ROLE}</span>
            </p>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft /> Prev
          </button>
          <span className="text-xs text-gray-400 font-medium">{currentIndex + 1} / {milestones.length}</span>
          <button onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === milestones.length - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            Next <ChevronRight />
          </button>
        </div>

        <div className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold px-2 mb-2">All Milestones</p>
          {milestones.map((m, i) => {
            const s = STATUS[m.status] ?? STATUS.pending;
            const isActive = i === currentIndex;
            return (
              <button key={m.id} onClick={() => goTo(i)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start gap-3 ${
                  isActive ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50 border border-transparent"
                }`}>
                <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold mt-0.5 ${
                  isActive ? "bg-blue-600 text-white" : `${s.bg} ${s.text} border ${s.border}`
                }`}>
                  {m.number}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${isActive ? "text-blue-700" : "text-gray-700"}`}>{m.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                    <span className={`text-xs ${isActive ? "text-blue-500" : "text-gray-400"}`}>{s.label}</span>
                    {m.critical && <span className="text-xs text-red-500 font-semibold">· Critical</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}