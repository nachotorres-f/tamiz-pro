import type { ReactNode } from 'react';
import { requirePageAccessForPath } from '@/lib/page-guard';

export default async function CalendarioLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requirePageAccessForPath('/calendario');

    return children;
}
