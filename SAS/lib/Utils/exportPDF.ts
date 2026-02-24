import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Shipment } from '@/types'

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric'
  })
}

// ─── All Shipments Export ─────────────────────────────────────
export function exportAllShipmentsPDF(shipments: Shipment[]) {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(18)
  doc.setTextColor(37, 99, 235)
  doc.text('Dart Global Logistics', 14, 18)

  doc.setFontSize(12)
  doc.setTextColor(30, 30, 30)
  doc.text('Shipments Overview Report', 14, 26)

  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32)
  doc.text(`Total Records: ${shipments.length}`, 14, 37)

  // Table
  autoTable(doc, {
    startY: 44,
    head: [['Shipment ID', 'Origin', 'Destination', 'Stage', 'Carrier', 'ETA', 'Priority']],
    body: shipments.map((s) => [
      `#${s.cargowiseId}`,
      `${s.originCity} (${s.originCountryCode})`,
      `${s.destinationCity} (${s.destinationCountryCode})`,
      s.currentStage.replace(/_/g, ' '),
      s.carrier,
      formatDate(s.estimatedArrival),
      s.isPriority ? 'Yes' : 'No',
    ]),
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 255],
    },
    styles: {
      cellPadding: 4,
    },
  })

  doc.save(`shipments-overview-${Date.now()}.pdf`)
}

// ─── Delayed Shipments Export ─────────────────────────────────
export function exportDelayedShipmentsPDF(shipments: Shipment[]) {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.setTextColor(220, 38, 38)
  doc.text('Dart Global Logistics', 14, 18)

  doc.setFontSize(12)
  doc.setTextColor(30, 30, 30)
  doc.text('Delayed Shipments Report', 14, 26)

  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32)
  doc.text(`Total Delayed: ${shipments.length}`, 14, 37)

  autoTable(doc, {
    startY: 44,
    head: [['Shipment ID', 'Route', 'Status', 'Carrier', 'ETA', 'Delay Days', 'Reason']],
    body: shipments.map((s) => [
      `#${s.cargowiseId}`,
      `${s.originCity} → ${s.destinationCity}`,
      s.currentStage.replace(/_/g, ' '),
      s.carrier,
      formatDate(s.estimatedArrival),
      s.delayDays ? `${s.delayDays} days` : '—',
      s.delayReason ?? '—',
    ]),
    headStyles: {
      fillColor: [220, 38, 38],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [255, 245, 245],
    },
    styles: {
      cellPadding: 4,
    },
  })

  doc.save(`delayed-shipments-${Date.now()}.pdf`)
}

// ─── Archived Shipments Export ────────────────────────────────
export function exportArchivedShipmentsPDF(shipments: Shipment[]) {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.setTextColor(5, 150, 105)
  doc.text('Dart Global Logistics', 14, 18)

  doc.setFontSize(12)
  doc.setTextColor(30, 30, 30)
  doc.text('Archived Shipments Report', 14, 26)

  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32)
  doc.text(`Total Archived: ${shipments.length}`, 14, 37)

  autoTable(doc, {
    startY: 44,
    head: [['Shipment ID', 'Route', 'Carrier', 'Delivery Date', 'Archived Date', 'Transit Days']],
    body: shipments.map((s) => [
      `#${s.cargowiseId}`,
      `${s.originCity} → ${s.destinationCity}`,
      s.carrier,
      formatDate(s.deliveryDate),
      formatDate(s.archivedDate),
      s.transitDays ? `${s.transitDays} days` : '—',
    ]),
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244],
    },
    styles: {
      cellPadding: 4,
    },
  })

  doc.save(`archived-shipments-${Date.now()}.pdf`)
}

// ─── Single Shipment Detail Export ───────────────────────────
export function exportShipmentDetailPDF(shipment: Shipment) {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(18)
  doc.setTextColor(37, 99, 235)
  doc.text('Dart Global Logistics', 14, 18)

  doc.setFontSize(13)
  doc.setTextColor(30, 30, 30)
  doc.text(`Shipment Report - #${shipment.cargowiseId}`, 14, 27)

  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 33)

  // Shipment Info
  autoTable(doc, {
    startY: 40,
    head: [['Field', 'Value']],
    body: [
      ['Shipment ID', `#${shipment.cargowiseId}`],
      ['Job Number', shipment.jobNumber ?? '—'],
      ['House Bill Number', shipment.houseBillNumber ?? '—'],
      ['Status', shipment.currentStage.replace(/_/g, ' ')],
      ['Carrier', shipment.carrier],
      ['Transport Mode', shipment.transportMode ?? '—'],
      ['Branch', shipment.branch ?? '—'],
      ['Origin', `${shipment.originCity} (${shipment.originCountryCode})`],
      ['Destination', `${shipment.destinationCity} (${shipment.destinationCountryCode})`],
      ['ETA', formatDate(shipment.estimatedArrival)],
      ['Priority', shipment.isPriority ? 'Yes' : 'No'],
      ['Delay Reason', shipment.delayReason ?? '—'],
      ['Delay Days', shipment.delayDays ? `${shipment.delayDays} days` : '—'],
    ],
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
    },
    styles: { cellPadding: 4 },
  })

  // Cargo Timeline
  const timelineY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0) + 10
  doc.setFontSize(11)
  doc.setTextColor(30, 30, 30)
  doc.text('Cargo Timeline', 14, timelineY)

  autoTable(doc, {
    startY: timelineY + 5,
    head: [['Event', 'Date']],
    body: [
      ['Cargo Ready', formatDate(shipment.cargoReadyDate)],
      ['Cargo Received', formatDate(shipment.cargoReceivedDate)],
      ['Cargo Pickup', formatDate(shipment.cargoPickupDate)],
    ],
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9 },
    styles: { cellPadding: 4 },
  })

  // Route Details
  const routeY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0) + 10
  doc.setFontSize(11)
  doc.setTextColor(30, 30, 30)
  doc.text('Route Details', 14, routeY)

  autoTable(doc, {
    startY: routeY + 5,
    head: [['', 'Shipper (From)', 'Consignee (To)']],
    body: [
      ['Name', shipment.shipperName ?? shipment.originCity, shipment.consigneeName ?? shipment.destinationCity],
      ['Address', shipment.shipperAddress ?? '—', shipment.consigneeAddress ?? '—'],
      ['Contact', shipment.shipperContact ?? '—', shipment.consigneeContact ?? '—'],
      ['Phone / Email', shipment.shipperPhone ?? '—', shipment.consigneeEmail ?? '—'],
    ],
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
    },
    styles: { cellPadding: 4 },
  })

  // Created By
  const createdY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0) + 10
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`Created By: ${shipment.createdBy.name} (${shipment.createdBy.email})`, 14, createdY)
  doc.text(`Last Updated By: ${shipment.lastUpdatedBy.name} (${shipment.lastUpdatedBy.email})`, 14, createdY + 6)

  doc.save(`shipment-${shipment.cargowiseId}-${Date.now()}.pdf`)
}