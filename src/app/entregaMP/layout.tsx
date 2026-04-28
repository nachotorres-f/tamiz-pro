import type { ReactNode } from 'react';
import { requirePageAccessForPath } from '@/lib/page-guard';

export default async function EntregaMPLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requirePageAccessForPath('/entregaMP');

    return children;
}
