import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const salon = searchParams.get('salon');

    const salones = ['El Central', 'La Rural'];
    const usarNotIn = salon !== 'B';

    const comandas = await prisma.comanda.findMany({
        where: {
            ...(salon && {
                lugar: usarNotIn ? { notIn: salones } : { in: salones },
            }),
        },
    });

    const eventos = comandas.map((comanda) => ({
        title: comanda.lugar + ' - ' + comanda.salon,
        date: comanda.fecha.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        id: comanda.id,
    }));

    return NextResponse.json(eventos);
}
