import { getUserFromRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { requirePageKeyAccess } from '@/lib/page-guard';

export async function GET(req: NextRequest) {
    const accessResult = await requirePageKeyAccess(req, 'usuarios');

    if (accessResult instanceof NextResponse) {
        const user = await getUserFromRequest(req);
        return NextResponse.json({ user });
    }

    const user = accessResult;
    return NextResponse.json({ user });
}
