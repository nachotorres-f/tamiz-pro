import type { ReactNode } from 'react';
import { requirePageAccessForPath } from '@/lib/page-guard';

export default async function PickingLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requirePageAccessForPath('/picking');

    return children;
}
