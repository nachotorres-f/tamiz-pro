import { logAudit } from '@/lib/audit';
import { requirePageKeyAccess } from '@/lib/page-guard';
import { obtenerDetalleRecetaExpedicion } from '@/server/expedicion/receta';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';
    const accessResult = await requirePageKeyAccess(req, 'expedicion');

    if (accessResult instanceof NextResponse) {
        return accessResult;
    }

    const { searchParams } = req.nextUrl;
    const comandaId = Number(searchParams.get('comandaId'));
    const platoId = Number(searchParams.get('platoId'));

    if (
        !Number.isFinite(comandaId) ||
        comandaId <= 0 ||
        !Number.isFinite(platoId) ||
        platoId <= 0
    ) {
        return NextResponse.json(
            { error: 'Parámetros inválidos' },
            { status: 400 },
        );
    }

    try {
        const detalle = await obtenerDetalleRecetaExpedicion(comandaId, platoId);

        if (!detalle) {
            return NextResponse.json(
                { error: 'Plato no encontrado' },
                { status: 404 },
            );
        }

        await logAudit({
            modulo: 'expedicion',
            accion: 'consultar_receta_plato_expedicion',
            ruta: '/api/exEvento/receta',
            metodo: 'GET',
            resumen: `Consulta de receta de expedición para plato ${platoId}`,
            detalle: {
                comandaId,
                platoId,
                codigo: detalle.plato.codigo,
            },
        });

        return NextResponse.json(detalle);
    } catch (error) {
        await logAudit({
            modulo: 'expedicion',
            accion: 'consultar_receta_plato_expedicion',
            ruta: '/api/exEvento/receta',
            metodo: 'GET',
            estado: 'error',
            resumen: 'Error consultando receta de expedición',
            detalle: {
                comandaId,
                platoId,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al consultar la receta' },
            { status: 500 },
        );
    }
}
