import './globals.css'

export const metadata = {
  title: 'Dart Global Logistics - SAS Systems',
  description: 'Secure, real-time alert management for global supply chains',
}

export default function RootLayout({ children }) {
  return (
<<<<<<< HEAD
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
=======
    <html lang="en">
  <head>
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    />
  </head>
  <body className="antialiased">
    {children}
  </body>
</html>
>>>>>>> 99762374183279ee8046687e9690d09ac424354d
  );

}