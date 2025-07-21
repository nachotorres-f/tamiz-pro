import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { format, startOfWeek, addDays } from 'date-fns';

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const fechaInicio = searchParams.get('fechaInicio');

    if (!fechaInicio) {
        return NextResponse.json(
            { error: 'fechaInicio es requerido' },
            { status: 400 }
        );
    }

    const inicio = startOfWeek(new Date(fechaInicio), { weekStartsOn: 4 });

    // Obtener todos los nombres de recetas PT de una vez
    const recetasPT = await prisma.receta.findMany({
        where: { tipo: 'PT' },
        select: { nombreProducto: true },
    });
    const nombresPT = new Set(recetasPT.map((r) => r.nombreProducto));

    // Traer solo los eventos/platos que coinciden con recetas PT
    const eventos = await prisma.comanda.findMany({
        where: {
            fecha: { gte: inicio, lte: addDays(inicio, 9) },
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

    const produccion = await prisma.produccion.findMany({
        where: {
            fecha: { gte: addDays(inicio, -1), lte: addDays(inicio, 9) },
            plato: { in: Array.from(nombresPT) },
        },
    });

    resultado.sort((a, b) => a.plato.localeCompare(b.plato));

    console.log('PRODUCCIOn', produccion);

    return NextResponse.json({ planifacion: resultado, produccion });
}

export async function POST(req: NextRequest) {
    const produccion = await req.json();

    if (!Array.isArray(produccion)) {
        return NextResponse.json(
            { error: 'El cuerpo debe ser un array de producciones' },
            { status: 400 }
        );
    }

    for (const item of produccion) {
        if (!item.plato || !item.fecha || typeof item.cantidad !== 'number') {
            return NextResponse.json(
                { error: 'Cada item debe tener plato, fecha y cantidad' },
                { status: 400 }
            );
        }

        const existe = await prisma.produccion.findFirst({
            where: {
                plato: item.plato,
                fecha: new Date(item.fecha),
            },
        });

        if (existe) {
            if (existe.cantidad === item.cantidad) continue; // No hay cambios

            // Si hay cambios, actualizamos la cantidad
            await prisma.produccion.update({
                where: { id: existe.id },
                data: { cantidad: item.cantidad },
            });
            continue;
        } else {
            // Si no existe, creamos una nueva entrada
            await prisma.produccion.create({
                data: {
                    plato: item.plato,
                    fecha: new Date(item.fecha),
                    cantidad: item.cantidad,
                },
            });
        }
    }

    return NextResponse.json({ message: 'Producción actualizada' });
}
