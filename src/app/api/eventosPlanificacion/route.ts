import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

interface Evento {
    fecha: Date;
}

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFinal = searchParams.get('fechaFinal');
    const salon = searchParams.get('salon');

    if (!fechaInicio || !fechaFinal || !salon) {
        return NextResponse.json(
            { error: 'Faltan parámetros de fecha' },
            { status: 400 }
        );
    }

    const final = new Date(fechaFinal);

    const eventos = await prisma.comanda.findMany({
        where: {
            fecha: {
                gte: new Date(fechaInicio),
                lte: addDays(final, 2),
            },
            lugar:
                salon === 'A'
                    ? { notIn: ['El Central', 'La Rural'] }
                    : { in: ['El Central', 'La Rural'] },
        },
        orderBy: {
            fecha: 'asc',
        },
    });

    const res = NextResponse.json({
        eventos,
        maxRepeticion: maxRepeticionesPorDia(eventos),
    });
    return res;
}

function maxRepeticionesPorDia(array: Evento[]) {
    const contador: { [dia: string]: number } = {};

    array.forEach((item) => {
        const dia = new Date(item.fecha).toISOString().split('T')[0];
        contador[dia] = (contador[dia] || 0) + 1;
    });

    const max = Math.max(...Object.values(contador));

    return max;
}
