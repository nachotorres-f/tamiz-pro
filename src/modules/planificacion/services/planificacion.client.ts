import type {
    ActualizarComandaPlanificacionPayload,
    ActualizarPlatoAdelantadoPayload,
    EventosPlanificacionResponse,
    GuardarPlanificacionPayload,
    PlanificacionResponse,
    PlatoAdelantado,
    SalonPlanificacion,
} from '@/modules/planificacion/types';

async function parseApiResponse<T>(
    response: Response,
    fallbackMessage: string,
): Promise<T> {
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const error =
            data &&
            typeof data === 'object' &&
            'error' in data &&
            typeof data.error === 'string'
                ? data.error
                : fallbackMessage;

        throw new Error(error);
    }

    return data as T;
}

export async function fetchPlanificacion(params: {
    fechaInicio: string;
    salon: SalonPlanificacion;
    signal?: AbortSignal;
}): Promise<PlanificacionResponse> {
    const searchParams = new URLSearchParams({
        fechaInicio: params.fechaInicio,
        salon: params.salon,
    });

    const response = await fetch(`/api/planificacion?${searchParams.toString()}`, {
        signal: params.signal,
    });
    const data = await parseApiResponse<Partial<PlanificacionResponse>>(
        response,
        'No se pudo cargar la planificación',
    );
    const planificacion = Array.isArray(data.planificacion)
        ? data.planificacion
        : [];

    return {
        planificacion,
        produccion: Array.isArray(data.produccion) ? data.produccion : [],
    };
}

export async function guardarPlanificacion(
    payload: GuardarPlanificacionPayload,
): Promise<void> {
    const response = await fetch('/api/planificacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    await parseApiResponse(response, 'No se pudieron guardar los cambios');
}

export async function fetchEventosPlanificacion(params: {
    fechaInicio: string;
    fechaFinal: string;
    salon: SalonPlanificacion;
    incluirDeshabilitadas?: boolean;
}): Promise<EventosPlanificacionResponse> {
    const searchParams = new URLSearchParams({
        fechaInicio: params.fechaInicio,
        fechaFinal: params.fechaFinal,
        salon: params.salon,
    });

    if (params.incluirDeshabilitadas) {
        searchParams.set('incluirDeshabilitadas', 'true');
    }

    const response = await fetch(
        `/api/eventosPlanificacion?${searchParams.toString()}`,
    );

    return parseApiResponse<EventosPlanificacionResponse>(
        response,
        'No se pudieron cargar los eventos de planificación',
    );
}

export async function actualizarEstadoComandaPlanificacion(
    payload: ActualizarComandaPlanificacionPayload,
): Promise<void> {
    const response = await fetch('/api/planificacion/comanda', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    await parseApiResponse(response, 'Error al actualizar la comanda');
}

export async function fetchPlatosAdelantados(
    eventoId: number,
    signal?: AbortSignal,
): Promise<PlatoAdelantado[]> {
    const response = await fetch(
        `/api/planificacion/adelantarEvento?id=${eventoId}`,
        {
            signal,
        },
    );
    const data = await parseApiResponse<{ Plato?: PlatoAdelantado[] }>(
        response,
        'No se pudieron cargar los platos adelantados',
    );

    return Array.isArray(data.Plato) ? data.Plato : [];
}

export async function actualizarPlatoAdelantado(
    payload: ActualizarPlatoAdelantadoPayload,
): Promise<void> {
    const response = await fetch('/api/planificacion/adelantarEvento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    await parseApiResponse(response, 'No se pudo actualizar el adelanto');
}
