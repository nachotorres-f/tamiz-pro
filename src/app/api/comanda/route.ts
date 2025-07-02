// app/api/external-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const API_KEY = process.env.API_KEY;

export async function POST(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();

    body.Id = Number(body.Id);

    for (const key in body) {
        const value = body[key];

        try {
            // Intentamos decodificar si parece un JSON string anidado
            if (key.includes('MomnetoId')) {
                const firstParse = JSON.parse(value); // convierte \\u0022 a "

                for (const keyParse in firstParse) {
                    if (keyParse.includes('MomnetoComidaId')) {
                        const secondParse = JSON.parse(firstParse[keyParse]); // parsea el JSON final
                        firstParse[keyParse] = secondParse; // reemplaza el valor original
                    }
                }

                body[key] = firstParse;
            } else {
                body[key] = value;
            }
        } catch {
            body[key] = value; // si falla, lo dejamos como está
        }
    }

    console.log('JSON', body);

    // Aquí podés usar Prisma para guardar la info en tu base de datos
    // await prisma.order.create({ data: { ... } })

    const horaInicio = body.Inicio.split(': ')[1].split(' a')[0];
    const horaFin = body.Inicio.split(' a ')[1];
    console.log('horaFin', horaFin);

    const ahora = new Date();

    const horarioInicio = new Date(
        Date.UTC(
            ahora.getFullYear(),
            ahora.getMonth(),
            ahora.getDate(),
            parseInt(horaInicio.split(':')[0]),
            parseInt(horaInicio.split(':')[1])
        )
    );

    const horarioFin = new Date(
        Date.UTC(
            ahora.getFullYear(),
            ahora.getMonth(),
            ahora.getDate(),
            parseInt(horaFin.split(':')[0]),
            parseInt(horaFin.split(':')[1])
        )
    );

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

    for (const key in body) {
        if (key.includes('MomnetoId')) {
            for (const [item] of Object.entries(body[key])) {
                if (
                    item.includes('MomnetoComidaId') &&
                    !tiposOmitir.some((tipo) =>
                        body[key][item]['ComidaFamilia']
                            .toLowerCase()
                            .includes(tipo.toLowerCase())
                    )
                ) {
                    const existente = await prisma.plato.findFirst({
                        where: {
                            nombre: body[key][item]['ComidaDescripcion'],
                            comandaId: body.Id,
                        },
                    });

                    if (existente) {
                        await prisma.plato.update({
                            where: { id: existente.id },
                            data: {
                                cantidad: Number(
                                    body[key][item]['ComidaTotal']
                                ),
                            },
                        });
                    } else {
                        await prisma.plato.create({
                            data: {
                                nombre: body[key][item]['ComidaDescripcion'],
                                cantidad: Number(
                                    body[key][item]['ComidaTotal']
                                ),
                                comandaId: body.Id,
                            },
                        });
                    }
                }
            }
        }
    }

    return NextResponse.json({ success: true }, { status: 201 });
}
