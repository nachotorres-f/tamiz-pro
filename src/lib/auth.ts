import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

const SECRET = process.env.JWT_SECRET!;

export function generateToken(payload: object) {
    return jwt.sign(payload, SECRET, { expiresIn: '1h' });
}

export function verifyToken(token: string) {
    try {
        return jwt.verify(token, SECRET);
    } catch {
        return null;
    }
}

const JWT_SECRET = process.env.JWT_SECRET!;

export async function getUserFromRequest(req: NextRequest) {
    const token = req.cookies.get('token')?.value;

    if (!token) return null;

    try {
        const payload = jwt.verify(token, JWT_SECRET) as {
            id: number;
        };

        const user = await prisma.user.findUnique({
            where: { id: Number(payload.id) },
            select: { id: true, username: true, rol: true, salon: true },
        });

        return user;
    } catch {
        return null;
    }
}
