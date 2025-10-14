import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const id = Number(searchParams.get('id'));

    const comanda = await prisma.comanda.findUnique({
        where: { id },
        include: { Plato: true },
    });

    return NextResponse.json(comanda);
}

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { id, adelantar } = await req.json();
    if (typeof id !== 'number' || typeof adelantar !== 'boolean') {
        return NextResponse.json(
            { error: 'Faltan parámetros' },
            { status: 400 }
        );
    }

    const plato = await prisma.plato.findUnique({
        where: { id },
        include: { comanda: true },
    });

    if (!plato) {
        return NextResponse.json(
            { error: 'Plato no encontrado' },
            { status: 404 }
        );
    }

    await prisma.plato.update({
        where: { id },
        data: {
            fecha: adelantar ? plato.comanda.fecha : null,
        },
    });

    return NextResponse.json({ success: true });
}
