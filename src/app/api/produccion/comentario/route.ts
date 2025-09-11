import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const body = await req.json();
    const { plato, cantidad, fecha, comentario } = body;

    if (!plato || !cantidad || !fecha) {
        return NextResponse.json(
            { error: 'Datos incompletos' },
            { status: 400 }
        );
    }

    const data = await prisma.produccion.findFirst({
        where: {
            plato,
            fecha: new Date(fecha.split('T')[0]),
            cantidad,
        },
    });

    if (!data) {
        return NextResponse.json(
            { error: 'No se encontró la producción' },
            { status: 404 }
        );
    }

    await prisma.produccion.update({
        where: { id: data.id },
        data: { observacionProduccion: comentario },
    });

    return NextResponse.json({ ok: true });
}
