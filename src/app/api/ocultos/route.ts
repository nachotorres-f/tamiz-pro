import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const { plato } = await req.json();
    if (!plato)
        return NextResponse.json({ error: 'Plato requerido' }, { status: 400 });

    await prisma.platoOculto.create({
        data: {
            plato,
        },
    });

    return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const plato = searchParams.get('plato');
    if (!plato)
        return NextResponse.json({ error: 'Plato requerido' }, { status: 400 });

    await prisma.platoOculto.deleteMany({ where: { plato } });
    return NextResponse.json({ success: true });
}

export async function GET() {
    const ocultos = await prisma.platoOculto.findMany();
    return NextResponse.json(ocultos.map((p) => p.plato));
}
