import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { format, startOfWeek, addDays } from 'date-fns';

export async function GET() {
    const fechaBase = new Date();
    const inicio = startOfWeek(fechaBase, { weekStartsOn: 0 });

    const eventos = await prisma.comanda.findMany({
        where: {
            fecha: {
                gte: inicio,
            },
        },
        include: {
            Plato: true,
        },
    });

    const resultado: { plato: string; fecha: string; cantidad: number }[] = [];

    for (const evento of eventos) {
        for (const plato of evento.Plato) {
            resultado.push({
                plato: plato.nombre,
                fecha: format(addDays(evento.fecha, 1), 'yyyy-MM-dd'),
                cantidad: plato.cantidad,
            });
        }
    }

    resultado.sort((a, b) => a.plato.localeCompare(b.plato));

    return NextResponse.json(resultado);
}
