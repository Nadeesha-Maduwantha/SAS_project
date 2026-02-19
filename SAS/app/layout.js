import './globals.css'

export const metadata = {
  title: 'Dart Global Logistics - SAS Systems',
  description: 'Secure, real-time alert management for global supply chains',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
