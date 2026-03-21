import { NextRequest, NextResponse } from 'next/server';
import {
    obtenerEventosPlanificacion,
    setPlanificacionTimezone,
} from '@/server/services/planificacion.service';
import {
    getRouteErrorMessage,
    getRouteErrorStatus,
    parseObtenerEventosPlanificacionInput,
} from '@/server/planificacion/validators/planificacion.validator';

export async function GET(req: NextRequest) {
    setPlanificacionTimezone();

    try {
        const input = parseObtenerEventosPlanificacionInput(
            req.nextUrl.searchParams,
        );
        const resultado = await obtenerEventosPlanificacion(input);

        return NextResponse.json(resultado);
    } catch (error) {
        return NextResponse.json(
            { error: getRouteErrorMessage(error) },
            { status: getRouteErrorStatus(error) },
        );
    }
}
