import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    const comandas = await prisma.comanda.findMany();

    const eventos = comandas.map((comanda) => ({
        title: comanda.nombre,
        date: comanda.fecha.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        id: comanda.id,
    }));

    return NextResponse.json(eventos);
}
