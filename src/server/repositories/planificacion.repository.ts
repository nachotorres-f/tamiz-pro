import { Prisma } from '@prisma/client';
import { addDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import {
    DIAS_EVENTOS_CICLO,
    DIAS_INICIO_ADELANTOS,
    DIAS_PRODUCCION_EXTRA,
    LUGARES_SALON_B,
} from '@/server/planificacion/constants';
import type {
    ObtenerEventosPlanificacionInput,
    ObtenerPlanificacionInput,
} from '@/server/planificacion/types';

type PlanificacionDb = Prisma.TransactionClient | typeof prisma;

function getPlanificacionDb(db: PlanificacionDb = prisma) {
    return db;
}

function construirClaveProduccionUnique(params: {
    fecha: string;
    platoCodigo: string;
    platoPadreCodigo: string;
    salon: ObtenerPlanificacionInput['salon'];
}) {
    return {
        platoCodigo_platoPadreCodigo_fecha_salon: {
            fecha: new Date(params.fecha),
            platoCodigo: params.platoCodigo,
            platoPadreCodigo: params.platoPadreCodigo,
            salon: params.salon,
        },
    } satisfies Prisma.ProduccionWhereUniqueInput;
}

export async function findRecetasPlanificacion() {
    return prisma.receta.findMany({});
}

export async function findEventosSemanaPlanificacion(
    inicio: Date,
    codigosPT: string[],
    salon: ObtenerPlanificacionInput['salon'],
) {
    const usarNotIn = salon === 'A';
    const fechaFinCiclo = addDays(inicio, DIAS_EVENTOS_CICLO);
    const fechaInicioAdelantos = addDays(inicio, DIAS_INICIO_ADELANTOS);

    return prisma.comanda.findMany({
        where: {
            deshabilitadaPlanificacion: false,
            OR: [
                {
                    fecha: {
                        gte: inicio,
                        lte: fechaFinCiclo,
                    },
                    lugar: usarNotIn
                        ? { notIn: [...LUGARES_SALON_B] }
                        : { in: [...LUGARES_SALON_B] },
                    Plato: {
                        some: {
                            codigo: { in: codigosPT },
                        },
                    },
                },
                {
                    fecha: {
                        gte: fechaInicioAdelantos,
                    },
                    lugar: usarNotIn
                        ? { notIn: [...LUGARES_SALON_B] }
                        : { in: [...LUGARES_SALON_B] },
                    Plato: {
                        some: {
                            codigo: { in: codigosPT },
                            fecha: {
                                not: null,
                            },
                        },
                    },
                },
                {
                    id: 1,
                },
            ],
        },
        include: {
            Plato: {
                where: {
                    codigo: { in: codigosPT },
                    OR: [
                        {
                            comanda: {
                                fecha: {
                                    gte: inicio,
                                    lte: fechaFinCiclo,
                                },
                            },
                        },
                        {
                            fecha: {
                                not: null,
                            },
                            comanda: {
                                fecha: {
                                    gte: fechaInicioAdelantos,
                                },
                            },
                        },
                    ],
                },
            },
        },
    });
}

export async function findProduccionPlanificacion(
    inicio: Date,
    salon: ObtenerPlanificacionInput['salon'],
    db: PlanificacionDb = prisma,
) {
    return getPlanificacionDb(db).produccion.findMany({
        where: {
            fecha: {
                gte: addDays(inicio, -DIAS_PRODUCCION_EXTRA.anterior),
                lte: addDays(inicio, DIAS_PRODUCCION_EXTRA.posterior),
            },
            salon,
        },
    });
}

export async function updateObservacionesProduccionPlanificacion(
    params: {
        platoCodigo: string;
        platoPadreCodigo: string;
        salon: ObtenerPlanificacionInput['salon'];
        fechaInicio: string;
        observacion: string;
        plato: string;
        platoPadre: string;
    },
    db: PlanificacionDb = prisma,
) {
    return getPlanificacionDb(db).produccion.updateMany({
        where: {
            platoCodigo: params.platoCodigo,
            platoPadreCodigo: params.platoPadreCodigo,
            salon: params.salon,
            fecha: {
                gte: new Date(params.fechaInicio),
                lte: addDays(new Date(params.fechaInicio), 11),
            },
        },
        data: {
            observacion: params.observacion,
            plato: params.plato,
            platoPadre: params.platoPadre,
        },
    });
}

export async function deleteProduccionPlanificacion(
    params: {
        platoCodigo: string;
        platoPadreCodigo: string;
        fecha: string;
        salon: ObtenerPlanificacionInput['salon'];
    },
    db: PlanificacionDb = prisma,
) {
    return getPlanificacionDb(db).produccion.deleteMany({
        where: {
            platoCodigo: params.platoCodigo,
            platoPadreCodigo: params.platoPadreCodigo,
            fecha: new Date(params.fecha),
            salon: params.salon,
        },
    });
}

export async function findProduccionRegistro(
    params: {
        platoCodigo: string;
        platoPadreCodigo: string;
        fecha: string;
        salon: ObtenerPlanificacionInput['salon'];
    },
    db: PlanificacionDb = prisma,
) {
    return getPlanificacionDb(db).produccion.findUnique({
        where: construirClaveProduccionUnique(params),
    });
}

export async function upsertProduccionRegistro(
    params: {
        plato: string;
        platoCodigo: string;
        platoPadre: string;
        platoPadreCodigo: string;
        fecha: string;
        cantidad: number;
        salon: ObtenerPlanificacionInput['salon'];
        observacion: string;
    },
    db: PlanificacionDb = prisma,
) {
    return getPlanificacionDb(db).produccion.upsert({
        where: construirClaveProduccionUnique(params),
        update: {
            cantidad: params.cantidad,
            salon: params.salon,
            observacion: params.observacion,
            plato: params.plato,
            platoPadre: params.platoPadre,
            platoCodigo: params.platoCodigo,
            platoPadreCodigo: params.platoPadreCodigo,
        },
        create: {
            plato: params.plato,
            platoCodigo: params.platoCodigo,
            platoPadre: params.platoPadre,
            platoPadreCodigo: params.platoPadreCodigo,
            fecha: new Date(params.fecha),
            cantidad: params.cantidad,
            salon: params.salon,
            observacion: params.observacion,
        },
    });
}

export async function findEventosPlanificacion(params: {
    fechaInicio: ObtenerEventosPlanificacionInput['fechaInicio'];
    fechaFinal: ObtenerEventosPlanificacionInput['fechaFinal'];
    salon: ObtenerEventosPlanificacionInput['salon'];
    incluirDeshabilitadas: boolean;
}) {
    const final = new Date(params.fechaFinal);

    return prisma.comanda.findMany({
        where: {
            fecha: {
                gte: new Date(params.fechaInicio),
                lte: addDays(final, 2),
            },
            lugar:
                params.salon === 'A'
                    ? { notIn: [...LUGARES_SALON_B] }
                    : { in: [...LUGARES_SALON_B] },
            ...(params.incluirDeshabilitadas
                ? {}
                : { deshabilitadaPlanificacion: false }),
        },
        orderBy: {
            fecha: 'asc',
        },
    });
}

export async function updateEstadoComandaPlanificacion(params: {
    id: number;
    deshabilitada: boolean;
}) {
    return prisma.comanda.update({
        where: { id: params.id },
        data: { deshabilitadaPlanificacion: params.deshabilitada },
        select: {
            id: true,
            deshabilitadaPlanificacion: true,
        },
    });
}

export async function findPlatosAdelantadosPorComanda(id: number) {
    return prisma.comanda.findUnique({
        where: { id },
        select: {
            Plato: {
                orderBy: { nombre: 'asc' },
                select: {
                    cantidad: true,
                    fecha: true,
                    id: true,
                    nombre: true,
                },
            },
        },
    });
}

export async function findPlatoConComanda(id: number) {
    return prisma.plato.findUnique({
        where: { id },
        include: { comanda: true },
    });
}

export async function updateFechaPlato(id: number, fecha: Date | null) {
    return prisma.plato.update({
        where: { id },
        data: {
            fecha,
        },
    });
}
