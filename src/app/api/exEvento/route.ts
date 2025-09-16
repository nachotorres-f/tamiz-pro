import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export interface Receta {
    id: string;
    nombreProducto: string;
    descripcion: string;
    // otras propiedades...
}

export interface IngredienteConRuta {
    ingrediente: string;
    ruta: string[];
    nivel: number;
}

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const id = searchParams.get('id');

    const evento = await prisma.comanda.findFirst({
        where: {
            id: id ? Number(id) : undefined,
        },
        include: {
            Plato: true,
        },
    });

    const platos = await Promise.all(
        evento?.Plato.map(async ({ nombre, cantidad }) => {
            const recetas = await prisma.receta.findMany({
                where: {
                    nombreProducto: nombre,
                },
            });

            return await Promise.all(
                recetas.map(
                    async ({ codigo, subCodigo, porcionBruta, ...receta }) => {
                        const checkExpedicion =
                            await prisma.expedicion.findFirst({
                                select: { id: true },
                                where: {
                                    comandaId: Number(id),
                                    codigo,
                                    subCodigo,
                                },
                            });

                        return {
                            codigo,
                            subCodigo,
                            ...receta,
                            porcionBruta: (porcionBruta * cantidad).toFixed(2),
                            check: !!checkExpedicion,
                        };
                    }
                )
            );
        }) ?? []
    );

    return NextResponse.json(platos);
}

interface Body {
    comandaId: number;
    codigo: string;
    subCodigo: string;
}

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';
    const { comandaId, codigo, subCodigo }: Body = await req.json();

    if (!comandaId || !codigo || !subCodigo) {
        return NextResponse.json({
            json: 400,
            message: 'Faltan datos para marcar la expedicion',
        });
    }

    const exist = await prisma.expedicion.findFirst({
        where: {
            comandaId,
            codigo,
            subCodigo,
        },
    });

    if (exist) {
        return NextResponse.json({ success: true }, { status: 201 });
    }

    await prisma.expedicion.create({
        data: {
            comandaId,
            codigo,
            subCodigo,
        },
    });

    return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';
    const { comandaId, codigo, subCodigo }: Body = await req.json();

    if (!comandaId || !codigo || !subCodigo) {
        return NextResponse.json({
            json: 400,
            message: 'Faltan datos para borrar la expedicion',
        });
    }

    await prisma.expedicion.deleteMany({
        where: {
            comandaId,
            codigo,
            subCodigo,
        },
    });

    return NextResponse.json({ success: true }, { status: 201 });
}
