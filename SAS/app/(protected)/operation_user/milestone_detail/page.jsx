"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import MilestoneMap from "@/app/components/MilestoneMap";

// ─── Role config ──────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  admin: {
    recipient:    (s) => s.operationsUser,
    buttonLabel:  (m) => m.critical ? "Urgent — Alert Operations" : "Alert Operations User",
    buttonColor:  (m) => m.critical ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700",
    modalTitle:   "Alert Operations User",
    modalSubtitle:(s) => `This email will be sent to the Operations user responsible for this shipment`,
    emailSubject: (m, s) => `${m.critical ? "[URGENT] " : ""}Action Required — ${m.name} — ${s.id}`,
    emailBody:    (m, s) =>
      `Dear ${s.operationsUser.name},\n\nThis is an alert from the Admin regarding Shipment ${s.id} for client ${s.client}.\n\nMilestone "${m.name}" is currently ${m.status.toUpperCase()} — expected by ${m.date}.\n\nPlease take immediate action on this milestone${m.critical ? " — this is marked CRITICAL" : ""}.\n\nShipment: ${s.id}\nMilestone: ${m.name}\nExpected Date: ${m.date}\nLocation: ${m.location.label}\n\nKindly update CargoWise once resolved.\n\nRegards,\nSAS Admin`,
    confirmMsg:   (m, s) => `${s.operationsUser.name} has been notified to take action on milestone "${m.name}".`,
  },
  superuser: {
    recipient:    (s) => s.operationsUser,
    buttonLabel:  (m) => m.critical ? "Urgent — Alert Operations" : "Alert Operations User",
    buttonColor:  (m) => m.critical ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700",
    modalTitle:   "Alert Operations User",
    modalSubtitle:(s) => `This email will be sent to the Operations user responsible for this shipment`,
    emailSubject: (m, s) => `${m.critical ? "[URGENT] " : ""}Action Required — ${m.name} — ${s.id}`,
    emailBody:    (m, s) =>
      `Dear ${s.operationsUser.name},\n\nThis is an alert from your Department Head regarding Shipment ${s.id} for client ${s.client}.\n\nMilestone "${m.name}" is currently ${m.status.toUpperCase()} — expected by ${m.date}.\n\nPlease take action on this at the earliest${m.critical ? " — CRITICAL milestone" : ""}.\n\nShipment: ${s.id}\nMilestone: ${m.name}\nExpected Date: ${m.date}\nLocation: ${m.location.label}\n\nUpdate CargoWise once complete.\n\nBest regards,\nDepartment Head`,
    confirmMsg:   (m, s) => `${s.operationsUser.name} has been notified to take action on milestone "${m.name}".`,
  },
  operations: {
    recipient:    (s) => s.shiplineContact,
    buttonLabel:  (m) => m.critical ? "Urgent — Alert Shipline" : "Alert Shipline",
    buttonColor:  (m) => m.critical ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700",
    modalTitle:   "Alert Shipline Contact",
    modalSubtitle:(s) => `This email will be sent to ${s.shiplineContact.company} to update CargoWise`,
    emailSubject: (m, s) => `${m.critical ? "[URGENT] " : ""}CargoWise Update Required — ${m.name} — ${s.id}`,
    emailBody:    (m, s) =>
      `Dear ${s.shiplineContact.name},\n\nI am writing regarding Shipment ${s.id} for ${s.client}.\n\nMilestone "${m.name}" is currently ${m.status.toUpperCase()} — expected by ${m.date}.\n\nPlease update CargoWise with the latest status for this milestone at your earliest convenience${m.critical ? " — this is a CRITICAL milestone requiring urgent attention" : ""}.\n\nShipment Reference: ${s.id}\nMilestone: ${m.name}\nExpected Date: ${m.date}\nLocation: ${m.location.label}\n\nKindly confirm once CargoWise has been updated.\n\nBest regards,\n${s.operationsUser.name}\nDart Global Logistics`,
    confirmMsg:   (m, s) => `${s.shiplineContact.name} at ${s.shiplineContact.company} has been notified to update CargoWise for milestone "${m.name}".`,
  },
  sales: {
    recipient:    (s) => s.clientContact,
    buttonLabel:  (m) => m.critical ? "Urgent — Contact Client" : "Contact Client",
    buttonColor:  (m) => m.critical ? "bg-red-600 hover:bg-red-700" : "bg-violet-600 hover:bg-violet-700",
    modalTitle:   "Contact Client",
    modalSubtitle:(s) => `This email will be sent to the client contact at ${s.clientContact.company}`,
    emailSubject: (m, s) => `${m.critical ? "[URGENT] " : ""}Shipment Update — ${s.id} — ${m.name}`,
    emailBody:    (m, s) =>
      `Dear ${s.clientContact.name},\n\nWe are writing to update you regarding your shipment ${s.id}.\n\nWe wanted to inform you that the milestone "${m.name}" is currently ${m.status === "overdue" ? "delayed" : "in progress"} — originally expected by ${m.date}.\n\n${m.status === "overdue" ? "Our operations team is actively working to resolve this and we will keep you updated on progress." : "We are monitoring this closely and will notify you of any changes."}\n\nShipment Reference: ${s.id}\nRoute: ${s.route}\nMilestone: ${m.name}\nExpected Date: ${m.date}\n\nPlease do not hesitate to contact us if you have any questions.\n\nKind regards,\nDart Global Logistics`,
    confirmMsg:   (m, s) => `${s.clientContact.name} at ${s.clientContact.company} has been notified about milestone "${m.name}".`,
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
const XIcon        = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const SendIcon     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;

// ─── Take Action Modal ────────────────────────────────────────────────────────
function TakeActionModal({ milestone, shipment, role, onClose, onSent }) {
  const [step, setStep] = useState(1);
  const config    = ROLE_CONFIG[role];
  const recipient = config.recipient(shipment);
  const [emailBody, setEmailBody] = useState(config.emailBody(milestone, shipment));
  const handleSend = () => { setStep(2); onSent(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{config.modalTitle}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{config.modalSubtitle(shipment)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <XIcon />
          </button>
        </div>
        {step === 1 ? (
          <>
            {milestone.critical && (
              <div className="mx-6 mt-4 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-red-500 mt-0.5"><AlertIcon /></div>
                <div>
                  <p className="text-sm font-semibold text-red-700">Critical Milestone</p>
                  <p className="text-xs text-red-600 mt-0.5">This milestone is marked CRITICAL. Urgent attention is required.</p>
                </div>
              </div>
            )}
            <div className="px-6 pt-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="w-10 text-gray-400 font-medium text-xs uppercase">To</span>
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="font-medium text-gray-800">{recipient.name}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500 text-xs">{recipient.email}</span>
                  <span className="ml-auto text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-md">{recipient.company}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="w-10 text-gray-400 font-medium text-xs uppercase">From</span>
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="font-medium text-gray-800">{shipment.operationsUser.name}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500 text-xs">{shipment.operationsUser.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="w-10 text-gray-400 font-medium text-xs uppercase">Subj</span>
                <div className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 text-xs">
                  {config.emailSubject(milestone, shipment)}
                </div>
              </div>
            </div>
            <div className="px-6 pt-3">
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono leading-relaxed"
              />
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 mt-2">
              <p className="text-xs text-gray-400">
                {role === "operations" ? "The shipline must update CargoWise — SAS will auto-resolve once synced."
                  : role === "sales" ? "Client will be notified of the shipment status update."
                  : "The operations user will be alerted to take action."}
              </p>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleSend} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                  <SendIcon /> Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mb-4 text-emerald-600">
              <CheckIcon />
            </div>
            <h4 className="text-base font-semibold text-gray-900 mb-1">Email Sent</h4>
            <p className="text-sm text-gray-500 text-center max-w-sm">{config.confirmMsg(milestone, shipment)}</p>
            {role === "operations" && (
              <p className="text-xs text-gray-400 mt-3">SAS will auto-resolve this alert on next sync once CargoWise is updated.</p>
            )}
            <button onClick={onClose} className="mt-6 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MilestonePage() {
  const searchParams = useSearchParams();

  // ✅ ALL hooks inside the component
  const [shipment,      setShipment]      = useState(null);
  const [milestones,    setMilestones]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [currentIndex,  setCurrentIndex]  = useState(0);
  const [showModal,     setShowModal]     = useState(false);
  const [sentMilestones, setSentMilestones] = useState(new Set());

  const USER_ROLE = "operations"; // replace with real role from session later

useEffect(() => {
  const shipmentId = searchParams.get("id") ?? "605ec73e-89d5-4d18-8721-5bd694bd9528";
  
  fetch(`http://localhost:5000/api/shipments/${shipmentId}`)
    .then(r => r.json())
    .then(result => {
      setShipment(result.data.shipment);

      // Transform flat DB columns into nested location object the map expects
      const transformed = (result.data.milestones ?? []).map((m, i) => ({
        ...m,
        number: m.sequence_order + 1,
        date: m.due_date,
        completedAt: m.completed_date,
        critical: m.is_critical,
        location: {
          label: m.location_label ?? "Unknown",
          lat:   m.location_lat  ?? 0,
          lng:   m.location_lng  ?? 0,
        }
      }));

      setMilestones(transformed);
    })
    .catch(() => {})
    .finally(() => setLoading(false));
  }, []);


  // ── Loading guard ──
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

  const milestone  = milestones[currentIndex];
  const status     = STATUS[milestone?.status] ?? STATUS.pending;
  const hasSent    = sentMilestones.has(milestone?.id);
  const roleConfig = ROLE_CONFIG[USER_ROLE];

  const goTo       = (i) => { if (i >= 0 && i < milestones.length) setCurrentIndex(i); };
  const handleSent = () => setSentMilestones(prev => new Set([...prev, milestone.id]));

  return (
    <div className="min-h-screen bg-gray-50 flex" style={{ height: "100vh" }}>

      {/* ════════ LEFT ════════ */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

        {/* Shipment strip */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Shipment</p>
            <p className="text-sm font-semibold text-gray-900 font-mono">{shipment.id}</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Client</p>
            <p className="text-sm font-semibold text-gray-900">{shipment.client}</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Route</p>
            <p className="text-sm font-semibold text-gray-900">{shipment.route}</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Type</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
              {shipment.type}
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
              <p className="text-sm font-semibold text-gray-900">Day {milestone?.daysFromBooking}</p>
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
                <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-0.5">Operations</p>
                <p className="text-sm font-semibold text-gray-900">{shipment.operationsUser?.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{shipment.operationsUser?.role}</p>
                <p className="text-xs text-blue-600 mt-1">{shipment.operationsUser?.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0"><UserIcon /></div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Shipline Contact</p>
                <p className="text-sm font-semibold text-gray-900">{shipment.shiplineContact?.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{shipment.shiplineContact?.company}</p>
                <p className="text-xs text-gray-500 mt-1">{shipment.shiplineContact?.email}</p>
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
              onClick={() => setShowModal(true)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-colors ${roleConfig.buttonColor(milestone)}`}
            >
              <MailIcon />
              {roleConfig.buttonLabel(milestone)}
            </button>
          ) : (
            <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckIcon /> Milestone Completed
            </div>
          )}
          {hasSent && <p className="text-xs text-emerald-600 text-center mt-2 font-medium">✓ Alert sent successfully</p>}
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

      {showModal && milestone && (
        <TakeActionModal
          milestone={milestone}
          shipment={shipment}
          role={USER_ROLE}
          onClose={() => setShowModal(false)}
          onSent={handleSent}
        />
      )}
    </div>
  );
}