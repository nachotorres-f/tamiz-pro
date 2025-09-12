'use client';

import { Geist, Geist_Mono } from 'next/font/google';
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import AppNavbar from '../components/navbar';
import { usePathname } from 'next/navigation';
import React from 'react';
import { SalonContext } from '@/components/filtroPlatos';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [salon, setSalon] = React.useState<string>('A');
    const pathname = usePathname();

    return (
        <html lang="es">
            <head>
                <title>Tamiz Pro</title>
            </head>
            <body
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh',
                    backgroundColor: pathname === '/acceso' ? '#1C1C1C' : '',
                }}
                className={`${geistSans.variable} ${geistMono.variable}`}>
                <AppNavbar
                    salon={salon}
                    setSalon={setSalon}
                />
                <SalonContext.Provider value={salon}>
                    {children}
                </SalonContext.Provider>
            </body>
        </html>
    );
}
