import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './src/lib/auth';

export function middleware(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    const isLoggedIn = token && verifyToken(token);
    const isLoginPage = req.nextUrl.pathname === '/acceso';

    if (!isLoggedIn && !isLoginPage) {
        return NextResponse.redirect(new URL('/acceso', req.url));
    }

    if (isLoggedIn && isLoginPage) {
        return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/((?!_next|api|favicon.ico).*)'],
};
