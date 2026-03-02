import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function PATCH(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    try {
        const body = await req.json();
        const id = Number(body?.id);
        const deshabilitada = body?.deshabilitada;

        if (!Number.isInteger(id) || id <= 0) {
            return NextResponse.json(
                { error: 'id de comanda inválido' },
                { status: 400 },
            );
        }

        if (typeof deshabilitada !== 'boolean') {
            return NextResponse.json(
                { error: 'deshabilitada debe ser boolean' },
                { status: 400 },
            );
        }

        const comanda = await prisma.comanda.update({
            where: { id },
            data: { deshabilitadaPlanificacion: deshabilitada },
            select: {
                id: true,
                deshabilitadaPlanificacion: true,
            },
        });

        return NextResponse.json({ comanda });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            return NextResponse.json(
                { error: 'Comanda no encontrada' },
                { status: 404 },
            );
        }

        return NextResponse.json(
            { error: 'Error al actualizar estado de comanda' },
            { status: 500 },
        );
    }
}
