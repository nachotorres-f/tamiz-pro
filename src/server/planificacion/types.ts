import type {
    ActualizarComandaPlanificacionPayload,
    ActualizarPlatoAdelantadoPayload,
    GuardarPlanificacionPayload,
    PlanificacionIngrediente,
    SalonPlanificacion,
} from '@/modules/planificacion/types';

export interface RecetaPlanificacion {
    codigo: string;
    nombreProducto: string;
    descripcion: string;
    subCodigo: string;
    tipo: 'PT' | 'MP';
    porcionBruta: number;
}

export interface PlatoEventoPlanificacion {
    comandaId: number;
    plato: string;
    platoCodigo: string;
    fecha: string;
    cantidad: number;
    gestionado: boolean;
    lugar: string;
}

export interface RecetaMaps {
    codigosPT: Set<string>;
    recetasPTPorCodigoPadre: Map<string, RecetaPlanificacion[]>;
    codigoPorNombreProducto: Map<string, string>;
    codigoPorDescripcion: Map<string, string>;
    nombrePorCodigoPadre: Map<string, string>;
    nombrePorSubCodigo: Map<string, string>;
}

export interface ObtenerPlanificacionInput {
    fechaInicio: string;
    salon: SalonPlanificacion;
}

export interface ObtenerEventosPlanificacionInput {
    fechaInicio: string;
    fechaFinal: string;
    salon: SalonPlanificacion;
    incluirDeshabilitadas: boolean;
}

export type GuardarPlanificacionInput = GuardarPlanificacionPayload;
export type ActualizarComandaPlanificacionInput =
    ActualizarComandaPlanificacionPayload;
export type ActualizarAdelantoPlatoInput =
    ActualizarPlatoAdelantadoPayload;

export interface ObtenerAdelantoEventoInput {
    id: number;
}

export interface ResultadoEventosPlanificacion {
    eventos: Array<
        {
            cantidadInvitados: number;
        } & Record<string, unknown>
    >;
    maxRepeticion: number;
}

export interface ResultadoObtenerPlanificacion {
    planifacion: PlanificacionIngrediente[];
    planificacion: PlanificacionIngrediente[];
    produccion: Record<string, unknown>[];
}
