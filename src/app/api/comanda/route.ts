// app/api/external-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const API_KEY = process.env.API_KEY;

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();

    body.Id = Number(body.Id);

    // Decodifica MomnetoId y MomnetoComidaId en un solo paso
    Object.keys(body).forEach((key) => {
        const value = body[key];
        if (key.includes('MomnetoId')) {
            try {
                const firstParse = JSON.parse(value);
                Object.keys(firstParse).forEach((k) => {
                    if (k.includes('MomnetoComidaId')) {
                        try {
                            firstParse[k] = JSON.parse(firstParse[k]);
                        } catch {}
                    }
                });
                body[key] = firstParse;
            } catch {
                body[key] = value;
            }
        }
    });

    // Extrae horaInicio y horaFin de forma más robusta
    const [, horaInicio, horaFin] =
        body.Inicio.match(/: ([^a]+) a ([^]+)$/) || [];
    const ahora = new Date();
    const [hIni, mIni] = (horaInicio || '00:00').split(':').map(Number);
    const [hFin, mFin] = (horaFin || '00:00').split(':').map(Number);

    const horarioInicio = new Date(
        Date.UTC(
            ahora.getFullYear(),
            ahora.getMonth(),
            ahora.getDate(),
            hIni,
            mIni
        )
    );
    const horarioFin = new Date(
        Date.UTC(
            ahora.getFullYear(),
            ahora.getMonth(),
            ahora.getDate(),
            hFin,
            mFin
        )
    );

    // Upsert comanda
    await prisma.comanda.upsert({
        where: { id: body.Id },
        update: {},
        create: {
            id: body.Id,
            lugar: body.Lugar,
            salon: body.Espacio,
            tipo: body.Experiencia,
            fecha: new Date(body.Fecha),
            nombre: body.Cliente,
            horarioInicio,
            horarioFin,
            observaciones: body.Observaciones || '',
        },
    });

    const tiposOmitir = [
        'Vajilla',
        'Manteleria',
        'Barra',
        'Bebida',
        'Cervezas',
        'Fernet',
        'Champagne',
        'Vino',
        'Cafe',
    ];

    // Prepara los platos a upsert en batch
    const platos: {
        nombre: string;
        cantidad: number;
        comandaId: number;
    }[] = [];

    Object.keys(body).forEach((key) => {
        if (key.includes('MomnetoId')) {
            Object.values(body[key]).forEach((item) => {
                const platoItem = item as {
                    ComidaFamilia?: string;
                    ComidaDescripcion?: string;
                    ComidaTotal?: number | string;
                };
                if (
                    platoItem.ComidaFamilia &&
                    !tiposOmitir.some((tipo) =>
                        platoItem
                            .ComidaFamilia!.toLowerCase()
                            .includes(tipo.toLowerCase())
                    )
                ) {
                    platos.push({
                        nombre: platoItem.ComidaDescripcion!,
                        cantidad: Number(platoItem.ComidaTotal),
                        comandaId: body.Id,
                    });
                }
            });
        }
    });

    // Busca platos existentes en una sola consulta
    const nombres = platos.map((p) => p.nombre);
    const existentes = await prisma.plato.findMany({
        where: {
            nombre: { in: nombres },
            comandaId: body.Id,
        },
        select: { id: true, nombre: true },
    });
    const existentesMap = new Map(existentes.map((e) => [e.nombre, e.id]));

    // Actualiza o crea platos en paralelo
    await Promise.all(
        platos.map(async (plato) => {
            const existenteId = existentesMap.get(plato.nombre);
            if (existenteId) {
                await prisma.plato.update({
                    where: { id: existenteId },
                    data: { cantidad: plato.cantidad },
                });
            } else {
                await prisma.plato.create({ data: plato });
            }
        })
    );

    return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const id = Number(body.Id);

    console.log(`Eliminando comanda con ID: ${id}`);

    // Elimina la comanda y sus platos asociados
    await prisma.plato.deleteMany({
        where: { comandaId: id },
    });

    await prisma.comanda.delete({
        where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
}
