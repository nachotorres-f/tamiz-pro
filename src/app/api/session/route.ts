import { NextResponse } from 'next/server';
import { getUserFromCookieStore } from '@/lib/auth';

export async function GET(req: Request) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const cookies = req.headers.get('cookie') || '';
    const token = cookies
        .split('; ')
        .find((cookie) => cookie.startsWith('token='))
        ?.split('=')[1];
    if (!token) return NextResponse.json({ loggedIn: false });

    const valid = await getUserFromCookieStore({
        get(name: string) {
            if (name !== 'token' || !token) {
                return undefined;
            }

            return { name, value: token };
        },
    });
    if (!valid) return NextResponse.json({ loggedIn: false });

    return NextResponse.json({ loggedIn: true, user: valid });
}
