/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { addDays, startOfWeek } from 'date-fns';

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const nombrePlato = searchParams.get('nombrePlato');
    const platoCodigo = searchParams.get('platoCodigo');

    const fechaBase = new Date();
    const inicio = startOfWeek(fechaBase, { weekStartsOn: 0 });

    let codigo = (platoCodigo ?? '').trim();
    if (!codigo && nombrePlato) {
        const receta = await prisma.receta.findFirst({
            where: {
                nombreProducto: nombrePlato,
            },
            select: {
                codigo: true,
            },
            orderBy: {
                id: 'asc',
            },
        });
        codigo = receta?.codigo ?? '';
    }

    const produccionesSelect = await prisma.produccion.findMany({
        where: {
            ...(codigo ? { platoCodigo: codigo } : { plato: nombrePlato || '' }),
            platoPadreCodigo: '',
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
        const { nombrePlato, platoCodigo, fecha, cantidad } = body;

        if ((!nombrePlato && !platoCodigo) || !fecha || !cantidad) {
            return NextResponse.json(
                {
                    error: 'Missing required fields: nombrePlato/platoCodigo, fecha, cantidad',
                },
                { status: 400 }
            );
        }

        let codigo = String(platoCodigo ?? '').trim();
        let nombre = String(nombrePlato ?? '').trim();

        if (!codigo && nombre) {
            const receta = await prisma.receta.findFirst({
                where: {
                    nombreProducto: nombre,
                },
                select: {
                    codigo: true,
                },
                orderBy: {
                    id: 'asc',
                },
            });
            codigo = receta?.codigo ?? '';
        }

        if (codigo && !nombre) {
            const receta = await prisma.receta.findFirst({
                where: {
                    codigo,
                },
                select: {
                    nombreProducto: true,
                },
                orderBy: {
                    id: 'asc',
                },
            });
            nombre = receta?.nombreProducto ?? '';
        }

        if (!codigo) {
            return NextResponse.json(
                { error: 'No se pudo resolver el código del plato' },
                { status: 400 },
            );
        }

        const nuevaProduccion = await prisma.produccion.create({
            data: {
                plato: nombre,
                platoCodigo: codigo,
                platoPadre: '',
                platoPadreCodigo: '',
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
