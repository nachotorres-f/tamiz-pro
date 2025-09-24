/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const body = await req.json();
    const { plato, produccion } = body;

    if (!plato || !produccion) {
        return NextResponse.json(
            { error: 'Datos incompletos' },
            { status: 400 }
        );
    }

    const fechas = Object.keys(produccion);

    await Promise.all(
        fechas.map(async (fecha) => {
            const existingProduccion = await prisma.produccion.findFirst({
                where: {
                    plato,
                    fecha: new Date(fecha),
                },
            });

            if (existingProduccion) {
                // Actualizamos la cantidad si ya existe
                await prisma.produccion.update({
                    where: { id: existingProduccion.id },
                    data: { cantidad: produccion[fecha] },
                });
                await updateGestionadoPlato(plato);
                return { ...existingProduccion, cantidad: produccion[fecha] };
            } else {
                // Creamos una nueva producción si no existe
                const newProduccion = await prisma.produccion.create({
                    data: {
                        plato,
                        fecha: new Date(fecha),
                        cantidad: produccion[fecha],
                    },
                });
                await updateGestionadoPlato(plato);
                return newProduccion;
            }
        })
    );

    await prisma.$executeRawUnsafe(`
        DELETE p1
        FROM producciones p1
        JOIN producciones p2
        ON p1.fecha = p2.fecha
        AND p1.plato = p2.plato
        AND p1.createdAt < p2.createdAt;
    `);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Ajusta al inicio de la semana (domingo)
    startOfWeek.setHours(0, 0, 0, 0); // Establece la hora al inicio del día

    const produccionSelect = await prisma.produccion.findMany({
        where: {
            plato,
            fecha: {
                gte: addDays(startOfWeek, -1), // Filtra producciones desde el inicio de la semana en adelante
            },
        },
        orderBy: {
            fecha: 'asc', // Ordena por fecha ascendente
        },
    });

    const data = produccionSelect.map((prod: any) => ({
        fecha: addDays(prod.fecha, 1),
        cantidad: prod.cantidad,
    }));

    return NextResponse.json({ success: true, data });
}

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const fechaInicio = searchParams.get('fechaInicio');
    const previa = searchParams.get('previa');

    if (!fechaInicio) {
        return NextResponse.json(
            { error: 'fechaInicio es requerido' },
            { status: 400 }
        );
    }

    const desde = addDays(new Date(fechaInicio), previa ? 2 : 0);
    desde.setHours(0, 0, 0, 0);
    const hasta = addDays(desde, 6);
    hasta.setHours(0, 0, 0, 0);

    const producciones = await prisma.produccion.findMany({
        where: {
            fecha: {
                gte: desde,
                lte: hasta,
            },
            cantidad: {
                gt: 0,
            },
        },
        orderBy: {
            plato: 'asc',
        },
    });

    const groupedProducciones: any[] = [];

    for (const produccion of producciones) {
        const existingPlato = groupedProducciones.find(
            (item: any) =>
                item.plato === produccion.plato &&
                item.platoPadre === produccion.platoPadre
        );

        if (existingPlato) {
            existingPlato.produccion.push({
                fecha: addDays(produccion.fecha, previa ? -1 : 1),
                cantidad: produccion.cantidad,
                comentario:
                    existingPlato.comentario +
                    (produccion.observacionProduccion || '') +
                    '\n',
            });
        } else {
            groupedProducciones.push({
                plato: produccion.plato,
                platoPadre: produccion.platoPadre,
                comentario: (produccion.observacionProduccion || '') + '\n',
                produccion: [
                    {
                        fecha: addDays(produccion.fecha, previa ? -1 : 1),
                        cantidad: produccion.cantidad,
                        comentario:
                            (produccion.observacionProduccion || '') + '\n',
                    },
                ],
                salon: produccion.salon,
            });
        }
    }

    return NextResponse.json({ success: true, data: groupedProducciones });
}

const updateGestionadoPlato = async (plato: string) => {
    try {
        const updatedPlato = await prisma.plato.updateMany({
            where: { nombre: plato, gestionado: false },
            data: { gestionado: true },
        });
        return updatedPlato;
    } catch (error) {
        console.error('Error updating gestionado for plato:', error);
        throw new Error('Error updating gestionado');
    }
};
