import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const salon: string = searchParams.get('salon') || 'A';
    const fechaInicio: string =
        searchParams.get('fechaInicio') || new Date().toISOString();

    const lugares = ['El Central', 'La Rural'];
    const usarNotIn = salon === 'A';

    const eventos = await prisma.comanda.findMany({
        where: {
            fecha: {
                gte: new Date(fechaInicio),
            },
            lugar: usarNotIn ? { notIn: lugares } : { in: lugares },
        },
    });

    return NextResponse.json({ eventos });
}
