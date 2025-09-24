import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const body = await req.json();
    const { plato, cantidad, fecha, salon } = body;

    if (!plato || !cantidad || !fecha || !salon) {
        return NextResponse.json(
            { error: 'Datos incompletos' },
            { status: 400 }
        );
    }

    const data = await prisma.produccion.findFirst({
        where: {
            plato,
            platoPadre: '',
            fecha: new Date(fecha.split('T')[0]),
            cantidad: parseFloat(cantidad),
            salon,
        },
    });

    if (data) {
        await prisma.produccion.update({
            where: { id: data.id },
            data: { cantidad: data.cantidad + parseFloat(cantidad) },
        });
    } else {
        await prisma.produccion.create({
            data: {
                plato,
                platoPadre: '',
                cantidad: parseFloat(cantidad),
                fecha: new Date(fecha.split('T')[0]),
                salon,
            },
        });
    }

    return NextResponse.json({ ok: true });
}
