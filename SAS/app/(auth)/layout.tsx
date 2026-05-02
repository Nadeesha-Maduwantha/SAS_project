'use client';


import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate loading time
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return <>{children}</>;
}

export function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>;
}
