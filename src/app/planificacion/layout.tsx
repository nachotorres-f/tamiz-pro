import type { ReactNode } from 'react';
import { requirePageAccessForPath } from '@/lib/page-guard';

export default async function PlanificacionLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requirePageAccessForPath('/planificacion');

    return children;
}
