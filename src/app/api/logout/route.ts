import { NextResponse } from 'next/server';

export async function POST() {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const res = NextResponse.json({ success: true });
    res.cookies.set('token', '', { maxAge: 0, path: '/' });
    return res;
}
