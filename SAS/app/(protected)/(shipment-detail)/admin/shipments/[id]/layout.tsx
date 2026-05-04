import React from 'react'


// Minimal layout for shipment detail page — no left nav by design.
// The detail page needs full width to display the 2-column layout properly.
export default function ShipmentDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      <main style={{ flex: 1, background: '#f9fafb' }}>
        {children}
      </main>
    </div>
  )
}