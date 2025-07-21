/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addDays, startOfWeek } from 'date-fns';

export async function POST(req: NextRequest) {
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
                return newProduccion;
            }
        })
    );

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
    const { searchParams } = req.nextUrl;
    const fechaInicio = searchParams.get('fechaInicio');

    if (!fechaInicio) {
        return NextResponse.json(
            { error: 'fechaInicio es requerido' },
            { status: 400 }
        );
    }

    const inicio = startOfWeek(new Date(fechaInicio), { weekStartsOn: 4 });

    const producciones = await prisma.produccion.findMany({
        where: {
            fecha: {
                gte: addDays(inicio, -1),
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
            (item: any) => item.plato === produccion.plato
        );

        if (existingPlato) {
            existingPlato.produccion.push({
                fecha: produccion.fecha,
                cantidad: produccion.cantidad,
            });
        } else {
            const isPrincipal = await platoIsPrincipal(produccion.plato).catch(
                () => false
            );
            groupedProducciones.push({
                plato: produccion.plato,
                principal: isPrincipal,
                produccion: [
                    {
                        fecha: produccion.fecha,
                        cantidad: produccion.cantidad,
                    },
                ],
            });
        }
    }

    return NextResponse.json({ success: true, data: groupedProducciones });
}

const platoIsPrincipal = async (plato: string): Promise<boolean> => {
    try {
        const exist = await prisma.plato.findFirst({
            where: {
                nombre: plato,
            },
            orderBy: {
                comanda: {
                    fecha: 'desc',
                },
            },
        });

        return !!exist;
    } catch (error) {
        console.error('Error checking if plato is principal:', error);
        return false;
    }
};
