import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { format, startOfWeek, addDays } from 'date-fns';

export async function GET() {
    const fechaBase = new Date();
    const inicio = startOfWeek(fechaBase, { weekStartsOn: 0 });

    // 1. Obtener todos los nombres de productos tipo 'PT' de una sola vez
    const recetasPT = await prisma.receta.findMany({
        where: { tipo: 'PT' },
        select: { nombreProducto: true },
    });
    const nombresPT = new Set(recetasPT.map((r) => r.nombreProducto));

    // 2. Obtener todas las comandas y platos relevantes
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

    // 3. Procesar y filtrar en memoria
    const resultado: { plato: string; fecha: string; cantidad: number }[] = [];

    for (const evento of eventos) {
        for (const plato of evento.Plato) {
            if (!nombresPT.has(plato.nombre)) {
                resultado.push({
                    plato: plato.nombre,
                    fecha: format(addDays(evento.fecha, 1), 'yyyy-MM-dd'),
                    cantidad: plato.cantidad,
                });
            }
        }
    }

    resultado.sort((a, b) => a.plato.localeCompare(b.plato));

    return NextResponse.json(resultado);
}
