import { getUserFromRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const user = await getUserFromRequest(req);
    return NextResponse.json({ user });
}
