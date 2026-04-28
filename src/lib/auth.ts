import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    getEffectiveAllowedPageKeys,
    normalizeAllowedPageKeys,
} from '@/lib/page-access';

const SECRET = process.env.JWT_SECRET!;

export interface TokenPayload {
    id: number;
    username: string;
    rol: string;
    salon: string;
    allowedPageKeys: string[];
}

export function generateToken(payload: TokenPayload) {
    return jwt.sign(payload, SECRET, { expiresIn: '1h' });
}

export function verifyToken(token: string) {
    try {
        const payload = jwt.verify(token, SECRET);

        if (
            typeof payload !== 'object' ||
            payload === null ||
            typeof payload.id !== 'number' ||
            typeof payload.username !== 'string' ||
            typeof payload.rol !== 'string' ||
            typeof payload.salon !== 'string' ||
            !Array.isArray(payload.allowedPageKeys)
        ) {
            return null;
        }

        return {
            id: payload.id,
            username: payload.username,
            rol: payload.rol,
            salon: payload.salon,
            allowedPageKeys: normalizeAllowedPageKeys(payload.allowedPageKeys),
        } satisfies TokenPayload;
    } catch {
        return null;
    }
}

async function getCurrentUserById(id: number) {
    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            username: true,
            rol: true,
            salon: true,
            pageAccessConfigured: true,
            pageAccess: {
                select: {
                    pageKey: true,
                },
            },
        },
    });

    if (!user) {
        return null;
    }

    return {
        id: user.id,
        username: user.username,
        rol: user.rol,
        salon: user.salon,
        allowedPageKeys: getEffectiveAllowedPageKeys({
            rol: user.rol,
            pageAccessConfigured: user.pageAccessConfigured,
            pageAccess: user.pageAccess,
        }),
    } satisfies TokenPayload;
}

export async function getUserFromCookieStore(
    cookieStore: {
        get: (name: string) => { value: string } | undefined;
    },
) {
    const token = cookieStore.get('token')?.value;

    if (!token) return null;

    const payload = verifyToken(token);

    if (!payload) {
        return null;
    }

    return getCurrentUserById(payload.id);
}

export async function getUserFromRequest(req: NextRequest) {
    return getUserFromCookieStore(req.cookies);
}
