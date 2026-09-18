// =============================================================
//  File: app/layout.tsx
// =============================================================

import type { Metadata } from 'next';
import { ThemeProvider } from '@/contexts/ThemeContext';
import './globals.css';

export const metadata: Metadata = {
  title:       'SAS System — Dart Global Logistics',
  description: 'Secure alert and shipment management platform',
  icons: {
    icon:     '/images/company-logo.png',   // same logo shown in the top bar
    shortcut: '/images/company-logo.png',
    apple:    '/images/company-logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}