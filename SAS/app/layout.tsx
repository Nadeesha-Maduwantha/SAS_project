import './globals.css'
import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
    title: 'Dart Global Logistics - SAS Systems',
    description: 'Secure, real-time alert management for global supply chains',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
<<<<<<< HEAD
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
                    rel="stylesheet"
                />
                <link
                    rel="stylesheet"
                    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                />
=======
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
>>>>>>> 71a8c07ded644f981fb3e2f715c66c0932dc9677
            </head>
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
<<<<<<< HEAD
}
=======
}
>>>>>>> 71a8c07ded644f981fb3e2f715c66c0932dc9677
