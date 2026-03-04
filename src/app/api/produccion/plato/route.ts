import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';

interface Body {
    platoCodigo?: string;
    cantidad?: number | string;
    fecha?: string;
    salon?: string;
}

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    let body: Body | null = null;

    try {
        const payload = (await req.json()) as Body;
        body = payload;
        const { platoCodigo, cantidad, fecha, salon } = payload;
        const cantidadNum = Number(cantidad);

        if (
            !platoCodigo ||
            !cantidad ||
            !fecha ||
            !salon ||
            !Number.isFinite(cantidadNum)
        ) {
            await logAudit({
                modulo: 'produccion',
                accion: 'agregar_plato_produccion',
                ruta: '/api/produccion/plato',
                metodo: 'POST',
                estado: 'warning',
                resumen: 'Datos incompletos para agregar plato a producción',
                detalle: payload,
            });

            return NextResponse.json(
                { error: 'Datos incompletos' },
                { status: 400 },
            );
        }

        const receta = await prisma.receta.findFirst({
            where: {
                codigo: platoCodigo,
            },
            select: {
                nombreProducto: true,
            },
            orderBy: {
                id: 'asc',
            },
        });

        if (!receta) {
            await logAudit({
                modulo: 'produccion',
                accion: 'agregar_plato_produccion',
                ruta: '/api/produccion/plato',
                metodo: 'POST',
                estado: 'warning',
                resumen: 'No se encontró receta para código en producción',
                detalle: {
                    platoCodigo,
                    fecha,
                    salon,
                },
            });

            return NextResponse.json(
                { error: 'No se encontró receta para el código enviado' },
                { status: 400 },
            );
        }

        const data = await prisma.produccion.findFirst({
            where: {
                platoCodigo,
            platoPadreCodigo: '',
            platoPadre: '',
            fecha: new Date(fecha.split('T')[0]),
            cantidad: cantidadNum,
            salon,
        },
    });

    if (data) {
        await prisma.produccion.update({
            where: { id: data.id },
            data: { cantidad: data.cantidad + cantidadNum },
        });
    } else {
        await prisma.produccion.create({
            data: {
                plato: receta.nombreProducto,
                platoCodigo,
                platoPadre: '',
                platoPadreCodigo: '',
                cantidad: cantidadNum,
                fecha: new Date(fecha.split('T')[0]),
                salon,
            },
            });
        }

        await logAudit({
            modulo: 'produccion',
            accion: 'agregar_plato_produccion',
            ruta: '/api/produccion/plato',
            metodo: 'POST',
            resumen: `Plato agregado en producción ${platoCodigo}`,
            detalle: {
                platoCodigo,
                fecha: fecha.split('T')[0],
                cantidad: cantidadNum,
                salon,
                modo: data ? 'update' : 'create',
            },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        await logAudit({
            modulo: 'produccion',
            accion: 'agregar_plato_produccion',
            ruta: '/api/produccion/plato',
            metodo: 'POST',
            estado: 'error',
            resumen: 'Error agregando plato a producción',
            detalle: {
                body,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al agregar plato a producción' },
            { status: 500 },
        );
    }
}
