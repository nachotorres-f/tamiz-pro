import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';

interface Body {
    platoCodigo?: string;
    cantidad?: number | string;
    fecha?: string;
    comentario?: string;
    platoPadreCodigo?: string;
    salon?: string;
}

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    let body: Body | null = null;

    try {
        const payload = (await req.json()) as Body;
        body = payload;
        const { platoCodigo, fecha, comentario, platoPadreCodigo, salon } =
            payload;

        if (
            !platoCodigo ||
            !fecha ||
            typeof platoPadreCodigo !== 'string' ||
            !salon
        ) {
            await logAudit({
                modulo: 'produccion',
                accion: 'comentar_produccion',
                ruta: '/api/produccion/comentario',
                metodo: 'POST',
                estado: 'warning',
                resumen: 'Datos incompletos para comentario de producción',
                detalle: payload,
            });

            return NextResponse.json(
                { error: 'Datos incompletos' },
                { status: 400 },
            );
        }

        const fechaBase = new Date(fecha.split('T')[0]);
        const fechaCompensada = addDays(fechaBase, -1);

        const data = await prisma.produccion.findFirst({
            where: {
                platoCodigo,
                platoPadreCodigo,
                salon,
                OR: [{ fecha: fechaBase }, { fecha: fechaCompensada }],
            },
            orderBy: {
                id: 'desc',
            },
        });

        if (!data) {
            await logAudit({
                modulo: 'produccion',
                accion: 'comentar_produccion',
                ruta: '/api/produccion/comentario',
                metodo: 'POST',
                estado: 'warning',
                resumen: 'No se encontró producción para comentar',
                detalle: {
                    platoCodigo,
                    platoPadreCodigo,
                    fecha,
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
            data: { observacionProduccion: comentario },
        });

        await logAudit({
            modulo: 'produccion',
            accion: 'comentar_produccion',
            ruta: '/api/produccion/comentario',
            metodo: 'POST',
            resumen: 'Comentario de producción actualizado',
            detalle: {
                id: data.id,
                platoCodigo,
                platoPadreCodigo,
                comentario,
            },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        await logAudit({
            modulo: 'produccion',
            accion: 'comentar_produccion',
            ruta: '/api/produccion/comentario',
            metodo: 'POST',
            estado: 'error',
            resumen: 'Error guardando comentario de producción',
            detalle: {
                body,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al guardar comentario de producción' },
            { status: 500 },
        );
    }
}
