import type {
    GuardarPlanificacionPayload,
    SalonPlanificacion,
} from '@/modules/planificacion/types';
import type {
    ActualizarAdelantoPlatoInput,
    ActualizarComandaPlanificacionInput,
    ObtenerAdelantoEventoInput,
    ObtenerEventosPlanificacionInput,
    ObtenerPlanificacionInput,
} from '@/server/planificacion/types';

export class PlanificacionValidationError extends Error {
    readonly status = 400;

    constructor(message: string) {
        super(message);
        this.name = 'PlanificacionValidationError';
    }
}

export class PlanificacionNotFoundError extends Error {
    readonly status = 404;

    constructor(message: string) {
        super(message);
        this.name = 'PlanificacionNotFoundError';
    }
}

function parseSalon(value: unknown): SalonPlanificacion {
    if (value === 'A' || value === 'B') {
        return value;
    }

    throw new PlanificacionValidationError('salon debe ser "A" o "B"');
}

function ensureFechaValida(value: string, fieldName: string) {
    if (Number.isNaN(new Date(value).getTime())) {
        throw new PlanificacionValidationError(`${fieldName} inválida`);
    }
}

function parsePositiveInteger(value: unknown, message: string): number {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new PlanificacionValidationError(message);
    }

    return parsed;
}

export function parseObtenerPlanificacionInput(
    searchParams: URLSearchParams,
): ObtenerPlanificacionInput {
    const fechaInicio = searchParams.get('fechaInicio');

    if (!fechaInicio) {
        throw new PlanificacionValidationError('fechaInicio es requerido');
    }

    ensureFechaValida(fechaInicio, 'fechaInicio');

    return {
        fechaInicio,
        salon: parseSalon(searchParams.get('salon') || 'A'),
    };
}

export function parseGuardarPlanificacionInput(
    body: unknown,
): GuardarPlanificacionPayload {
    if (!body || typeof body !== 'object') {
        throw new PlanificacionValidationError(
            'El cuerpo de la petición es inválido',
        );
    }

    const data = body as Partial<GuardarPlanificacionPayload>;

    if (!Array.isArray(data.produccion)) {
        throw new PlanificacionValidationError(
            'El cuerpo debe ser un array de producciones',
        );
    }

    if (!Array.isArray(data.observaciones)) {
        throw new PlanificacionValidationError(
            'El cuerpo debe ser un array de observaciones',
        );
    }

    if (!data.salon) {
        throw new PlanificacionValidationError('El salón es requerido');
    }

    if (!data.fechaInicio) {
        throw new PlanificacionValidationError('La fecha es requerido');
    }

    ensureFechaValida(data.fechaInicio, 'fechaInicio');

    return {
        salon: parseSalon(data.salon),
        produccion: data.produccion,
        observaciones: data.observaciones,
        fechaInicio: data.fechaInicio,
    };
}

export function parseObtenerEventosPlanificacionInput(
    searchParams: URLSearchParams,
): ObtenerEventosPlanificacionInput {
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFinal = searchParams.get('fechaFinal');
    const salon = searchParams.get('salon');

    if (!fechaInicio || !fechaFinal || !salon) {
        throw new PlanificacionValidationError('Faltan parámetros de fecha');
    }

    ensureFechaValida(fechaInicio, 'fechaInicio');
    ensureFechaValida(fechaFinal, 'fechaFinal');

    return {
        fechaInicio,
        fechaFinal,
        salon: parseSalon(salon),
        incluirDeshabilitadas:
            searchParams.get('incluirDeshabilitadas') === 'true',
    };
}

export function parseActualizarComandaPlanificacionInput(
    body: unknown,
): ActualizarComandaPlanificacionInput {
    if (!body || typeof body !== 'object') {
        throw new PlanificacionValidationError(
            'El cuerpo de la petición es inválido',
        );
    }

    const data = body as Partial<ActualizarComandaPlanificacionInput>;

    if (typeof data.deshabilitada !== 'boolean') {
        throw new PlanificacionValidationError(
            'deshabilitada debe ser boolean',
        );
    }

    return {
        id: parsePositiveInteger(data.id, 'id de comanda inválido'),
        deshabilitada: data.deshabilitada,
    };
}

export function parseObtenerAdelantoEventoInput(
    searchParams: URLSearchParams,
): ObtenerAdelantoEventoInput {
    return {
        id: parsePositiveInteger(
            searchParams.get('id'),
            'id de evento inválido',
        ),
    };
}

export function parseActualizarAdelantoPlatoInput(
    body: unknown,
): ActualizarAdelantoPlatoInput {
    if (!body || typeof body !== 'object') {
        throw new PlanificacionValidationError('Faltan parámetros');
    }

    const data = body as Partial<ActualizarAdelantoPlatoInput>;

    if (typeof data.adelantar !== 'boolean') {
        throw new PlanificacionValidationError('Faltan parámetros');
    }

    return {
        id: parsePositiveInteger(data.id, 'Faltan parámetros'),
        adelantar: data.adelantar,
    };
}

export function getRouteErrorStatus(error: unknown, fallback = 500): number {
    if (
        error instanceof PlanificacionValidationError ||
        error instanceof PlanificacionNotFoundError
    ) {
        return error.status;
    }

    return fallback;
}

export function getRouteErrorMessage(
    error: unknown,
    fallback = 'Error interno del servidor',
): string {
    if (
        error instanceof PlanificacionValidationError ||
        error instanceof PlanificacionNotFoundError
    ) {
        return error.message;
    }

    return error instanceof Error ? error.message : fallback;
}
