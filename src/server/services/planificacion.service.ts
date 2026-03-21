import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
    PLANIFICACION_TIMEZONE,
} from '@/server/planificacion/constants';
import {
    calcularIngredientesConFormato,
    calcularRangoSemana,
    construirClaveObservacion,
    crearMapasRecetas,
    mapearProduccionConNombres,
    mapearRecetasPlanificacion,
    maxRepeticionesPorDia,
    normalizarFechaInicioDia,
    normalizarTexto,
    obtenerObservacionPorCodigos,
    procesarEventosAPlatos,
    resolverCodigoPlato,
    resolverCodigoPlatoPadre,
    resolverNombrePlato,
    resolverNombrePlatoPadre,
} from '@/server/planificacion/mappers/planificacion.mapper';
import {
    deleteProduccionPlanificacion,
    findEventosPlanificacion,
    findEventosSemanaPlanificacion,
    findPlatoConComanda,
    findPlatosAdelantadosPorComanda,
    findProduccionPlanificacion,
    findProduccionRegistro,
    findRecetasPlanificacion,
    updateEstadoComandaPlanificacion,
    updateFechaPlato,
    updateObservacionesProduccionPlanificacion,
    upsertProduccionRegistro,
} from '@/server/repositories/planificacion.repository';
import type {
    ActualizarAdelantoPlatoInput,
    ActualizarComandaPlanificacionInput,
    GuardarPlanificacionInput,
    ObtenerAdelantoEventoInput,
    ObtenerEventosPlanificacionInput,
    ObtenerPlanificacionInput,
} from '@/server/planificacion/types';
import {
    PlanificacionNotFoundError,
    PlanificacionValidationError,
} from '@/server/planificacion/validators/planificacion.validator';

type MapasRecetasPlanificacion = ReturnType<typeof crearMapasRecetas>;

type ContextoGuardadoPlanificacion = {
    input: GuardarPlanificacionInput;
    mapasRecetas: MapasRecetasPlanificacion;
    observacionPorCodigos: Map<string, string>;
};

type RegistroProduccionNormalizado = {
    cantidad: number | null;
    eliminar: boolean;
    fecha: string;
    observacion: string;
    plato: string;
    platoCodigo: string;
    platoPadre: string;
    platoPadreCodigo: string;
    salon: GuardarPlanificacionInput['salon'];
};

type PlanificacionTransaction = Prisma.TransactionClient;

export function setPlanificacionTimezone() {
    process.env.TZ = PLANIFICACION_TIMEZONE;
}

async function obtenerMapasRecetasPlanificacion() {
    const recetas = mapearRecetasPlanificacion(await findRecetasPlanificacion());

    return crearMapasRecetas(recetas);
}

export async function obtenerPlanificacion(
    input: ObtenerPlanificacionInput,
) {
    const inicio = calcularRangoSemana(input.fechaInicio);
    const mapasRecetas = await obtenerMapasRecetasPlanificacion();

    const eventos = await findEventosSemanaPlanificacion(
        inicio,
        Array.from(mapasRecetas.codigosPT),
        input.salon,
    );
    const platos = procesarEventosAPlatos(eventos, mapasRecetas);

    const [ingredientes, produccion] = await Promise.all([
        calcularIngredientesConFormato(platos, mapasRecetas),
        obtenerProduccionConNombres(inicio, input.salon, mapasRecetas),
    ]);

    return {
        planifacion: ingredientes,
        planificacion: ingredientes,
        produccion,
        resumen: {
            eventos: eventos.length,
            ingredientes: ingredientes.length,
            produccion: produccion.length,
        },
    };
}

async function obtenerProduccionConNombres(
    inicio: Date,
    salon: ObtenerPlanificacionInput['salon'],
    mapasRecetas: MapasRecetasPlanificacion,
) {
    const inicioCiclo = normalizarFechaInicioDia(inicio);
    const produccion = await findProduccionPlanificacion(inicio, salon);

    return mapearProduccionConNombres(produccion, mapasRecetas, inicioCiclo);
}

async function crearContextoGuardadoPlanificacion(
    input: GuardarPlanificacionInput,
): Promise<ContextoGuardadoPlanificacion> {
    const mapasRecetas = await obtenerMapasRecetasPlanificacion();

    return {
        input,
        mapasRecetas,
        observacionPorCodigos: obtenerObservacionPorCodigos(
            input.observaciones,
            mapasRecetas,
        ),
    };
}

async function persistirObservacionesSinCambiosProduccion(
    context: ContextoGuardadoPlanificacion,
    db: PlanificacionTransaction,
) {
    if (
        context.input.produccion.length > 0 ||
        context.input.observaciones.length === 0
    ) {
        return;
    }

    for (const observacionProduccion of context.input.observaciones) {
        const platoCodigo = resolverCodigoPlato(
            observacionProduccion,
            context.mapasRecetas,
        );
        const platoPadreCodigo = resolverCodigoPlatoPadre(
            observacionProduccion,
            context.mapasRecetas,
        );

        if (!platoCodigo) {
            continue;
        }

        await updateObservacionesProduccionPlanificacion(
            {
                platoCodigo,
                platoPadreCodigo,
                salon: context.input.salon,
                fechaInicio: context.input.fechaInicio,
                observacion: normalizarTexto(observacionProduccion.observacion),
                plato: resolverNombrePlato(
                    platoCodigo,
                    context.mapasRecetas,
                    observacionProduccion.plato,
                ),
                platoPadre: resolverNombrePlatoPadre(
                    platoPadreCodigo,
                    context.mapasRecetas,
                    observacionProduccion.platoPadre,
                ),
            },
            db,
        );
    }
}

function normalizarRegistroProduccion(
    item: GuardarPlanificacionInput['produccion'][number],
    context: ContextoGuardadoPlanificacion,
): RegistroProduccionNormalizado {
    const eliminar = item.eliminar === true || item.cantidad === null;
    const cantidad = eliminar ? null : Number(item.cantidad);
    const platoCodigo = resolverCodigoPlato(item, context.mapasRecetas);
    const platoPadreCodigo = resolverCodigoPlatoPadre(item, context.mapasRecetas);

    if (
        !platoCodigo ||
        !item.fecha ||
        (!eliminar && !Number.isFinite(cantidad))
    ) {
        throw new PlanificacionValidationError(
            'Cada item debe tener platoCodigo, fecha y cantidad',
        );
    }

    return {
        cantidad,
        eliminar,
        fecha: item.fecha,
        observacion:
            context.observacionPorCodigos.get(
                construirClaveObservacion(platoCodigo, platoPadreCodigo),
            ) || '',
        plato: resolverNombrePlato(platoCodigo, context.mapasRecetas, item.plato),
        platoCodigo,
        platoPadre: resolverNombrePlatoPadre(
            platoPadreCodigo,
            context.mapasRecetas,
            item.platoPadre,
        ),
        platoPadreCodigo,
        salon: context.input.salon,
    };
}

function registroProduccionSinCambios(
    existente: {
        cantidad: number;
        observacion: string | null;
        plato: string;
        platoPadre: string;
    },
    registro: RegistroProduccionNormalizado,
) {
    if (registro.cantidad === null) {
        return false;
    }

    return (
        existente.cantidad === registro.cantidad &&
        existente.observacion === registro.observacion &&
        existente.plato === registro.plato &&
        existente.platoPadre === registro.platoPadre
    );
}

async function persistirRegistroProduccion(
    registro: RegistroProduccionNormalizado,
    db: PlanificacionTransaction,
) {
    if (registro.eliminar) {
        await deleteProduccionPlanificacion(
            {
                platoCodigo: registro.platoCodigo,
                platoPadreCodigo: registro.platoPadreCodigo,
                fecha: registro.fecha,
                salon: registro.salon,
            },
            db,
        );
        return;
    }

    const existente = await findProduccionRegistro(
        {
            platoCodigo: registro.platoCodigo,
            platoPadreCodigo: registro.platoPadreCodigo,
            fecha: registro.fecha,
            salon: registro.salon,
        },
        db,
    );

    if (existente && registroProduccionSinCambios(existente, registro)) {
        return;
    }

    await upsertProduccionRegistro(
        {
            plato: registro.plato,
            platoCodigo: registro.platoCodigo,
            platoPadre: registro.platoPadre,
            platoPadreCodigo: registro.platoPadreCodigo,
            fecha: registro.fecha,
            cantidad: registro.cantidad ?? 0,
            salon: registro.salon,
            observacion: registro.observacion,
        },
        db,
    );
}

async function persistirCambiosProduccion(
    context: ContextoGuardadoPlanificacion,
    db: PlanificacionTransaction,
) {
    const registros = context.input.produccion.map((item) =>
        normalizarRegistroProduccion(item, context),
    );

    for (const registro of registros) {
        await persistirRegistroProduccion(registro, db);
    }
}

export async function guardarPlanificacion(
    input: GuardarPlanificacionInput,
) {
    const context = await crearContextoGuardadoPlanificacion(input);

    await prisma.$transaction(async (tx) => {
        await persistirObservacionesSinCambiosProduccion(context, tx);
        await persistirCambiosProduccion(context, tx);
    });

    return {
        message: 'Producción actualizada',
        resumen: {
            cambiosProduccion: input.produccion.length,
            observaciones: input.observaciones.length,
        },
    };
}

export async function obtenerEventosPlanificacion(
    input: ObtenerEventosPlanificacionInput,
) {
    const eventos = await findEventosPlanificacion(input);

    const eventosConCantidadInvitados = eventos.map((evento) => ({
        ...evento,
        cantidadInvitados:
            Number(evento.cantidadMayores ?? 0) +
            Number(evento.cantidadMenores ?? 0),
    }));

    return {
        eventos: eventosConCantidadInvitados,
        maxRepeticion: maxRepeticionesPorDia(eventosConCantidadInvitados),
    };
}

export async function actualizarComandaPlanificacion(
    input: ActualizarComandaPlanificacionInput,
) {
    try {
        const comanda = await updateEstadoComandaPlanificacion(input);
        return { comanda };
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new PlanificacionNotFoundError('Comanda no encontrada');
        }

        throw error;
    }
}

export async function obtenerPlatosAdelantadosEvento(
    input: ObtenerAdelantoEventoInput,
) {
    const comanda = await findPlatosAdelantadosPorComanda(input.id);

    return {
        Plato: comanda?.Plato ?? [],
    };
}

export async function actualizarAdelantoPlato(
    input: ActualizarAdelantoPlatoInput,
) {
    const plato = await findPlatoConComanda(input.id);

    if (!plato) {
        throw new PlanificacionNotFoundError('Plato no encontrado');
    }

    await updateFechaPlato(
        input.id,
        input.adelantar ? plato.comanda.fecha : null,
    );

    return { success: true };
}
