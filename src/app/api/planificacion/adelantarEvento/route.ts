import { NextRequest, NextResponse } from 'next/server';
import {
    actualizarAdelantoPlato,
    obtenerPlatosAdelantadosEvento,
    setPlanificacionTimezone,
} from '@/server/services/planificacion.service';
import {
    getRouteErrorMessage,
    getRouteErrorStatus,
    parseActualizarAdelantoPlatoInput,
    parseObtenerAdelantoEventoInput,
} from '@/server/planificacion/validators/planificacion.validator';

export async function GET(req: NextRequest) {
    setPlanificacionTimezone();

    try {
        const input = parseObtenerAdelantoEventoInput(req.nextUrl.searchParams);
        const resultado = await obtenerPlatosAdelantadosEvento(input);

        return NextResponse.json(resultado);
    } catch (error) {
        return NextResponse.json(
            { error: getRouteErrorMessage(error) },
            { status: getRouteErrorStatus(error) },
        );
    }
}

export async function POST(req: NextRequest) {
    setPlanificacionTimezone();

    try {
        const input = parseActualizarAdelantoPlatoInput(await req.json());
        const resultado = await actualizarAdelantoPlato(input);

        return NextResponse.json(resultado);
    } catch (error) {
        return NextResponse.json(
            { error: getRouteErrorMessage(error) },
            { status: getRouteErrorStatus(error) },
        );
    }
}
