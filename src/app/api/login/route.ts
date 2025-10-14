import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { username, password } = await req.json();

    try {
        const user = await prisma.user.findUnique({ where: { username } });

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

        const token = generateToken({
            id: user.id,
        });

        const res = NextResponse.json({ success: true });

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
