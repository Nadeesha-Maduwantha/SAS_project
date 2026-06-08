// =============================================================
//  File: app/layout.tsx
//  Changes from your current version:
//    1. Import ThemeProvider from contexts/ThemeContext
//    2. Wrap children with ThemeProvider
//    3. Add suppressHydrationWarning to <html> — required
//       because ThemeContext adds/removes class="dark" on
//       the client after hydration, which would otherwise
//       cause a React warning
// =============================================================

import type { Metadata } from 'next';
import { ThemeProvider } from '@/contexts/ThemeContext';
import './globals.css';

export const metadata: Metadata = {
  title:       'SAS System — Dart Global Logistics',
  description: 'Secure alert and shipment management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning is REQUIRED here.
    // ThemeContext reads localStorage on the client and adds class="dark"
    // to <html>. The server renders without that class, so React sees a
    // mismatch and would throw a hydration warning without this prop.
    // suppressHydrationWarning only suppresses warnings on the element
    // it's placed on — it does NOT affect children.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script to apply dark class BEFORE paint — prevents flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('sas-theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (saved === 'dark' || (!saved && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}