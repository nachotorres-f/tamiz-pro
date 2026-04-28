import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromCookieStore, getUserFromRequest } from '@/lib/auth';
import {
    ACCESS_DENIED_PATH,
    PUBLIC_AUTH_PATH,
    canAccessPath,
    getDefaultRedirectPath,
} from '@/lib/page-access';

export async function requirePageAccessForPath(pathname: string) {
    const cookieStore = await cookies();
    const user = await getUserFromCookieStore(cookieStore);

    if (!user) {
        redirect(PUBLIC_AUTH_PATH);
    }

    const redirectPath = getDefaultRedirectPath(user.allowedPageKeys);

    if (!canAccessPath(pathname, user.allowedPageKeys)) {
        redirect(redirectPath || ACCESS_DENIED_PATH);
    }

    return user;
}

export async function requirePageKeyAccess(
    req: NextRequest,
    pageKey: string,
) {
    return requireAnyPageKeyAccess(req, [pageKey]);
}

export async function requireAnyPageKeyAccess(
    req: NextRequest,
    pageKeys: string[],
) {
    const user = await getUserFromRequest(req);

    if (!user) {
        return NextResponse.json(
            { success: false, message: 'Unauthorized' },
            { status: 401 },
        );
    }

    if (!pageKeys.some((pageKey) => user.allowedPageKeys.includes(pageKey))) {
        return NextResponse.json(
            { success: false, message: 'Forbidden' },
            { status: 403 },
        );
    }

    return user;
}
