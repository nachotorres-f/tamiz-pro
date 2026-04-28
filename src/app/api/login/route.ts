import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { generateToken } from '@/lib/auth';
import {
    getDefaultRedirectPath,
    getEffectiveAllowedPageKeys,
} from '@/lib/page-access';

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { username, password } = await req.json();

    try {
        const user = await prisma.user.findUnique({
            where: { username },
            select: {
                id: true,
                username: true,
                password: true,
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
            return NextResponse.json(
                {
                    success: false,
                    message: 'Usuario y/o contraseña incorrectos',
                },
                { status: 401 }
            );
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Usuario y/o contraseña incorrectos',
                },
                { status: 401 }
            );
        }

        const allowedPageKeys = getEffectiveAllowedPageKeys({
            rol: user.rol,
            pageAccessConfigured: user.pageAccessConfigured,
            pageAccess: user.pageAccess,
        });
        const redirectPath = getDefaultRedirectPath(allowedPageKeys);

        if (!redirectPath) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Sin acceso',
                },
                { status: 403 }
            );
        }

        const token = generateToken({
            id: user.id,
            username: user.username,
            rol: user.rol,
            salon: user.salon,
            allowedPageKeys,
        });

        const res = NextResponse.json({ success: true, redirectPath });

        res.cookies.set('token', token, {
            httpOnly: true,
            path: '/',
            maxAge: 60 * 60, // 1 hora
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        });

        return res;
    } catch {
        return NextResponse.json(
            { success: false, message: 'Error en el servidor' },
            { status: 500 }
        );
    }
}
