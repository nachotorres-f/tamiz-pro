import type { ReactNode } from 'react';
import { requirePageAccessForPath } from '@/lib/page-guard';

export default async function ExpedicionLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requirePageAccessForPath('/expedicion');

    return children;
}
