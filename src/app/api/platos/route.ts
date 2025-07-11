import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    const platos = await prisma.receta.findMany({
        distinct: ['nombreProducto'],
        select: {
            nombreProducto: true,
            codigo: true,
        },
    });

    const comandas = await prisma.comanda.findMany({
        where: {
            fecha: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
        },
    });

    return NextResponse.json({ platos, comandas });
}

export async function POST(request: NextRequest) {
    const {
        idComanda,
        plato,
        cantidad,
    }: { idComanda: string; plato: string; cantidad: number } =
        await request.json();

    if (!idComanda || !plato || !cantidad) {
        return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    try {
        const nuevoPlato = await prisma.plato.create({
            data: {
                nombre: plato,
                cantidad: cantidad,
                comanda: {
                    connect: { id: parseInt(idComanda) },
                },
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
