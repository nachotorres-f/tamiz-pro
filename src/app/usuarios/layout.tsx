import type { ReactNode } from 'react';
import { requirePageAccessForPath } from '@/lib/page-guard';

export default async function UsuariosLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requirePageAccessForPath('/usuarios');

    return children;
}
