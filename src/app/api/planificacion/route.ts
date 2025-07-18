import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { format, startOfWeek, addDays } from 'date-fns';

export async function GET() {
    const fechaBase = new Date();
    const inicio = startOfWeek(fechaBase, { weekStartsOn: 0 });

    // Obtener todos los nombres de recetas PT de una vez
    const recetasPT = await prisma.receta.findMany({
        where: { tipo: 'PT' },
        select: { nombreProducto: true },
    });
    const nombresPT = new Set(recetasPT.map((r) => r.nombreProducto));

    // Traer solo los eventos/platos que coinciden con recetas PT
    const eventos = await prisma.comanda.findMany({
        where: {
            fecha: { gte: inicio },
            Plato: {
                some: {
                    nombre: { in: Array.from(nombresPT) },
                },
            },
        },
        include: {
            Plato: true,
        },
    });

    const resultado: {
        plato: string;
        fecha: string;
        cantidad: number;
        gestionado: boolean;
        lugar: string;
    }[] = [];

    for (const evento of eventos) {
        for (const plato of evento.Plato) {
            if (nombresPT.has(plato.nombre)) {
                resultado.push({
                    plato: plato.nombre,
                    fecha: format(addDays(evento.fecha, 1), 'yyyy-MM-dd'),
                    cantidad: plato.cantidad,
                    gestionado: plato.gestionado || false,
                    lugar: evento.lugar,
                });
            }
        }
    }

    resultado.sort((a, b) => a.plato.localeCompare(b.plato));

    return NextResponse.json(resultado);
}
