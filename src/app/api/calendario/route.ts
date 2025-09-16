import { prisma } from '@/lib/prisma';
import { addWeeks, endOfWeek, isWithinInterval, startOfWeek } from 'date-fns';
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
        extendedProps: {
            cantidad: comanda.cantidadMayores + comanda.cantidadMenores,
        },
    }));

    const baseDate = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weeks = [0, 1, 2, 3].map((offset) => addWeeks(baseDate, offset));

    const resultado = weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

        const totalInvitados = comandas.reduce((acc, comanda) => {
            const fechaComanda = comanda.fecha;
            if (
                isWithinInterval(fechaComanda, {
                    start: weekStart,
                    end: weekEnd,
                })
            ) {
                return acc + comanda.cantidadMayores + comanda.cantidadMenores;
            }
            return acc;
        }, 0);

        return {
            semana: weekStart,
            totalInvitados,
        };
    });

    return NextResponse.json({ eventos, weeks: resultado });
}
