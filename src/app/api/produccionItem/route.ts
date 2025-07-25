/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { addDays, startOfWeek } from 'date-fns';

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const nombrePlato = searchParams.get('nombrePlato');

    const fechaBase = new Date();
    const inicio = startOfWeek(fechaBase, { weekStartsOn: 0 });

    const produccionesSelect = await prisma.produccion.findMany({
        where: {
            plato: nombrePlato || '',
            fecha: {
                gte: addDays(inicio, -1),
            },
        },
    });

    const producciones = produccionesSelect.map((produccion) => ({
        fecha: addDays(produccion.fecha, 1),
        cantidad: produccion.cantidad,
    }));

    return NextResponse.json({ producciones });
}

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    try {
        const body = await req.json();
        const { nombrePlato, fecha, cantidad } = body;

        if (!nombrePlato || !fecha || !cantidad) {
            return NextResponse.json(
                {
                    error: 'Missing required fields: nombrePlato, fecha, cantidad',
                },
                { status: 400 }
            );
        }

        const nuevaProduccion = await prisma.produccion.create({
            data: {
                plato: nombrePlato,
                fecha: new Date(fecha),
                cantidad,
            },
        });

        return NextResponse.json(
            { produccion: nuevaProduccion },
            { status: 201 }
        );
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to create produccion', details: error.message },
            { status: 500 }
        );
    }
}
