/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface Plato {
    nombre: string;
    cantidad: number;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            throw new Error('No se proporcionó ningún archivo');
        }

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

        const comanda = [];

        for (let i = 0; i < 5; i++) {
            const obj = json[i];
            comanda.push(obj[Object.keys(obj)[0]]);
        }

        const menu: Plato[] = [];
        const observaciones: string[] = [];
        let isObservaciones = false;

        json.forEach((dato, index) => {
            if (index < 5) return;

            if (index === 5) {
                const value = dato[Object.keys(dato)[0] as keyof typeof dato];
                if (value === 'Observaciones: ') {
                    isObservaciones = true;
                }
                return;
            }

            if (isObservaciones) {
                const mayor = dato[Object.keys(dato)[0] as keyof typeof dato];
                const menor = dato[Object.keys(dato)[1] as keyof typeof dato];

                if (mayor === 'M' && menor === 'm') {
                    isObservaciones = false;
                    return;
                }

                const observacion =
                    dato[Object.keys(dato)[0] as keyof typeof dato];
                observaciones.push(observacion);
            }

            const propertyCount = Object.keys(dato).length;

            const plato = dato[Object.keys(dato)[0] as keyof typeof dato];

            const tipo = dato[Object.keys(dato)[1] as keyof typeof dato];

            const cantidad =
                dato[
                    Object.keys(dato)[
                        Object.keys(dato).length - 1
                    ] as keyof typeof dato
                ];

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

            if (
                propertyCount === 7 &&
                typeof plato === 'string' &&
                typeof cantidad === 'number' &&
                typeof tipo === 'string' &&
                !tiposOmitir.some((tipoOmitir) =>
                    tipo.toLowerCase().includes(tipoOmitir.toLowerCase())
                )
            ) {
                menu.push({
                    nombre: plato,
                    cantidad: Number(cantidad),
                });
            }
        });

        const horario = comanda[4];
        const match = horario.match(/Inicio: (\d{2}:\d{2}) a (\d{2}:\d{2})/);

        if (!match) {
            throw new Error('El formato del horario no es válido');
        }

        const [hoursInicio, minutesInicio] = match[1].split(':').map(Number);
        const [hoursFin, minutesFin] = match[2].split(':').map(Number);

        const now = new Date();
        const horarioInicio = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hoursInicio,
            minutesInicio
        );
        const horarioFin = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hoursFin,
            minutesFin
        );

        await prisma.comanda.create({
            data: {
                salon: comanda[0],
                tipo: comanda[1],
                fecha: new Date(comanda[2]),
                nombre: comanda[3],
                horarioInicio,
                horarioFin,
                observaciones: observaciones.join(', '),
                Plato: {
                    create: menu.map((plato) => ({
                        nombre: plato.nombre,
                        cantidad: plato.cantidad,
                    })),
                },
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Evento procesado',
        });
    } catch {
        return NextResponse.json(
            { success: false, message: 'Error al leer el archivo' },
            { status: 500 }
        );
    }
}
