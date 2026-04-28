import type { ReactNode } from 'react';
import { requirePageAccessForPath } from '@/lib/page-guard';

export default async function ProduccionLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requirePageAccessForPath('/produccion');

    return children;
}
