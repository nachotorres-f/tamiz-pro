import { prisma } from '@/lib/prisma';
import { startOfWeek } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFinal = searchParams.get('fechaFinal');

    if (!fechaInicio || !fechaFinal) {
        return NextResponse.json(
            { error: 'Faltan parámetros de fecha' },
            { status: 400 }
        );
    }

    const inicio = startOfWeek(new Date(fechaFinal), {
        weekStartsOn: 0,
    }); //lunes

    const final = new Date(fechaFinal);

    const eventos = await prisma.comanda.findMany({
        where: {
            fecha: {
                gte: inicio,
                lte: final,
            },
        },
        orderBy: {
            fecha: 'asc',
        },
    });

    const res = NextResponse.json(eventos);
    return res;
}
