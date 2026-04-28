import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './src/lib/auth';
import {
    ACCESS_DENIED_PATH,
    PUBLIC_AUTH_PATH,
    getDefaultRedirectPath,
} from './src/lib/page-access';

export function middleware(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    const pathname = req.nextUrl.pathname;
    const user = token ? verifyToken(token) : null;
    const isLoginPage = pathname === PUBLIC_AUTH_PATH;

    if (!user && !isLoginPage) {
        return NextResponse.redirect(new URL(PUBLIC_AUTH_PATH, req.url));
    }

    if (!user) {
        return NextResponse.next();
    }

    const redirectPath = getDefaultRedirectPath(user.allowedPageKeys);

    if (isLoginPage || pathname === '/') {
        return NextResponse.redirect(
            new URL(redirectPath || ACCESS_DENIED_PATH, req.url),
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/((?!_next|api|favicon.ico).*)'],
};
