import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const id = searchParams.get('id');
    const comanda = await prisma.comanda.findFirst({
        where: { id: Number(id) },
        include: {
            Plato: true,
        },
    });

    return NextResponse.json(comanda);
}
