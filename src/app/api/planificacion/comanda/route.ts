import { NextRequest, NextResponse } from 'next/server';
import { requirePageKeyAccess } from '@/lib/page-guard';
import {
    actualizarComandaPlanificacion,
    setPlanificacionTimezone,
} from '@/server/services/planificacion.service';
import {
    getRouteErrorMessage,
    getRouteErrorStatus,
    parseActualizarComandaPlanificacionInput,
} from '@/server/planificacion/validators/planificacion.validator';

export async function PATCH(req: NextRequest) {
    setPlanificacionTimezone();
    const accessResult = await requirePageKeyAccess(req, 'planificacion');

    if (accessResult instanceof NextResponse) {
        return accessResult;
    }

    try {
        const input = parseActualizarComandaPlanificacionInput(await req.json());
        const resultado = await actualizarComandaPlanificacion(input);

        return NextResponse.json(resultado);
    } catch (error) {
        return NextResponse.json(
            { error: getRouteErrorMessage(error, 'Error al actualizar estado de comanda') },
            { status: getRouteErrorStatus(error) },
        );
    }
}
