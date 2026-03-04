import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const platos = await prisma.receta.findMany({
        distinct: ['nombreProducto'],
        select: {
            nombreProducto: true,
            codigo: true,
        },
    });

    return NextResponse.json({ platos });
}

export async function POST(request: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const {
        platoCodigo,
        cantidad,
        fecha,
    }: { platoCodigo: string; cantidad: string; fecha: string } =
        await request.json();

    if (!platoCodigo || !cantidad) {
        return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    try {
        const receta = await prisma.receta.findFirst({
            where: {
                codigo: platoCodigo,
            },
            select: {
                nombreProducto: true,
            },
            orderBy: {
                id: 'asc',
            },
        });

        if (!receta) {
            return NextResponse.json(
                { error: 'No se encontró receta para el código enviado' },
                { status: 400 },
            );
        }

        const nuevoPlato = await prisma.plato.create({
            data: {
                nombre: receta.nombreProducto,
                codigo: platoCodigo,
                cantidad: parseFloat(cantidad),
                comanda: {
                    connect: { id: 1 },
                },
                fecha: new Date(fecha.split('T')[0]),
            },
        });

        return NextResponse.json(nuevoPlato);
    } catch (error) {
        console.error('Error al crear el plato:', error);
        return NextResponse.json(
            { error: 'Error al crear el plato' },
            { status: 500 }
        );
    }
}
