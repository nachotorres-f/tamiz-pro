import { NextRequest, NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';
import {
    guardarPlanificacion,
    obtenerPlanificacion,
    setPlanificacionTimezone,
} from '@/server/services/planificacion.service';
import {
    getRouteErrorMessage,
    getRouteErrorStatus,
    parseGuardarPlanificacionInput,
    parseObtenerPlanificacionInput,
} from '@/server/planificacion/validators/planificacion.validator';

export async function GET(req: NextRequest) {
    setPlanificacionTimezone();

    try {
        const input = parseObtenerPlanificacionInput(req.nextUrl.searchParams);
        const resultado = await obtenerPlanificacion(input);

        await logAudit({
            modulo: 'planificacion',
            accion: 'consultar_planificacion',
            ruta: '/api/planificacion',
            metodo: 'GET',
            resumen: `Planificación consultada para salón ${input.salon}`,
            detalle: {
                fechaInicio: input.fechaInicio,
                salon: input.salon,
                ...resultado.resumen,
            },
        });

        return NextResponse.json({
            planifacion: resultado.planifacion,
            planificacion: resultado.planificacion,
            produccion: resultado.produccion,
        });
    } catch (error) {
        await logAudit({
            modulo: 'planificacion',
            accion: 'consultar_planificacion',
            ruta: '/api/planificacion',
            metodo: 'GET',
            estado: 'error',
            resumen: 'Error consultando planificación',
            detalle: {
                error: getRouteErrorMessage(error),
            },
        });

        return NextResponse.json(
            { error: getRouteErrorMessage(error) },
            { status: getRouteErrorStatus(error) },
        );
    }
}

export async function POST(req: NextRequest) {
    setPlanificacionTimezone();

    try {
        const input = parseGuardarPlanificacionInput(await req.json());
        const resultado = await guardarPlanificacion(input);

        await logAudit({
            modulo: 'planificacion',
            accion: 'guardar_planificacion',
            ruta: '/api/planificacion',
            metodo: 'POST',
            resumen: `Planificación guardada para salón ${input.salon}`,
            detalle: {
                fechaInicio: input.fechaInicio,
                salon: input.salon,
                ...resultado.resumen,
            },
        });

        return NextResponse.json({ message: resultado.message });
    } catch (error) {
        const mensajeError =
            error instanceof Error ? error.message : 'Error interno del servidor';

        await logAudit({
            modulo: 'planificacion',
            accion: 'guardar_planificacion',
            ruta: '/api/planificacion',
            metodo: 'POST',
            estado: 'error',
            resumen: 'Error guardando planificación',
            detalle: {
                error: mensajeError,
            },
        });

        return NextResponse.json(
            { error: getRouteErrorMessage(error) },
            { status: getRouteErrorStatus(error) },
        );
    }
}
