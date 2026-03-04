import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';

interface Body {
    platoCodigo?: string;
    cantidad?: number | string;
    fecha?: string;
    platoPadreCodigo?: string;
    salon?: string;
}

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    let body: Body | null = null;

    try {
        const payload = (await req.json()) as Body;
        body = payload;
        const { platoCodigo, cantidad, fecha, platoPadreCodigo, salon } = payload;
        const cantidadNum = Number(cantidad);

        if (
            !platoCodigo ||
            !cantidad ||
            !fecha ||
            typeof platoPadreCodigo !== 'string' ||
            !salon ||
            !Number.isFinite(cantidadNum)
        ) {
            await logAudit({
                modulo: 'produccion',
                accion: 'adelantar_produccion',
                ruta: '/api/produccion/adelantar',
                metodo: 'POST',
                estado: 'warning',
                resumen: 'Datos incompletos para adelantar producción',
                detalle: payload,
            });

            return NextResponse.json(
                { error: 'Datos incompletos' },
                { status: 400 },
            );
        }

        const data = await prisma.produccion.findFirst({
            where: {
                platoCodigo,
                platoPadreCodigo,
                fecha: new Date(fecha.split('T')[0]),
                cantidad: cantidadNum,
                salon,
            },
        });

        if (!data) {
            await logAudit({
                modulo: 'produccion',
                accion: 'adelantar_produccion',
                ruta: '/api/produccion/adelantar',
                metodo: 'POST',
                estado: 'warning',
                resumen: 'No se encontró producción para adelantar',
                detalle: {
                    platoCodigo,
                    platoPadreCodigo,
                    fecha,
                    cantidad: cantidadNum,
                    salon,
                },
            });

            return NextResponse.json(
                { error: 'No se encontró la producción' },
                { status: 404 },
            );
        }

        await prisma.produccion.update({
            where: { id: data.id },
            data: { fecha: addDays(fecha.split('T')[0], -1) },
        });

        await logAudit({
            modulo: 'produccion',
            accion: 'adelantar_produccion',
            ruta: '/api/produccion/adelantar',
            metodo: 'POST',
            resumen: 'Producción adelantada',
            detalle: {
                id: data.id,
                platoCodigo,
                platoPadreCodigo,
                fechaOriginal: fecha.split('T')[0],
            },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        await logAudit({
            modulo: 'produccion',
            accion: 'adelantar_produccion',
            ruta: '/api/produccion/adelantar',
            metodo: 'POST',
            estado: 'error',
            resumen: 'Error adelantando producción',
            detalle: {
                body,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al adelantar producción' },
            { status: 500 },
        );
    }
}
