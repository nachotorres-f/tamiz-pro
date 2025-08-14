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
        plato,
        cantidad,
        fecha,
    }: { plato: string; cantidad: number; fecha: string } =
        await request.json();

    if (!plato || !cantidad) {
        return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    try {
        const nuevoPlato = await prisma.plato.create({
            data: {
                nombre: plato,
                cantidad: cantidad,
                comanda: {
                    connect: { id: 1 },
                },
                fecha: new Date(fecha),
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
