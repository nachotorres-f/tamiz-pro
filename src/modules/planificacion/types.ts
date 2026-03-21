export type SalonPlanificacion = 'A' | 'B';

export type EstadoAutoGuardado =
    | 'idle'
    | 'pending'
    | 'saving'
    | 'saved'
    | 'error';

export interface EventoPlanificacion {
    id: number;
    cantidadInvitados: number;
    fecha: string;
    lugar: string;
    nombre: string;
    salon: string;
    deshabilitadaPlanificacion?: boolean;
}

export interface PlanificacionIngrediente {
    plato: string;
    platoCodigo: string;
    platoPadre: string;
    platoPadreCodigo: string;
    fecha: string;
    cantidad: number;
    lugar: string;
}

export interface PlanificacionFilaBase {
    plato: string;
    platoCodigo: string;
    platoPadre: string;
    platoPadreCodigo: string;
}

export interface ProduccionBase extends PlanificacionFilaBase {
    fecha: string;
}

export interface ProduccionPlanificacion extends ProduccionBase {
    id?: number;
    cantidad: number;
    observacion?: string | null;
    observacionProduccion?: string | null;
    salon?: string | null;
    createdAt?: string;
    updatedAt?: string;
    esAnteriorACiclo?: boolean;
}

export interface ProduccionEdit extends ProduccionBase {
    cantidad: number;
    eliminar?: false;
}

export interface ProduccionDelete extends ProduccionBase {
    cantidad: null;
    eliminar: true;
}

export type ProduccionChange = ProduccionEdit | ProduccionDelete;

export interface ObservacionPlanificacion extends PlanificacionFilaBase {
    observacion: string;
}

export interface PlanificacionResponse {
    planificacion: PlanificacionIngrediente[];
    produccion: ProduccionPlanificacion[];
}

export interface GuardarPlanificacionPayload {
    salon: SalonPlanificacion;
    produccion: ProduccionChange[];
    observaciones: ObservacionPlanificacion[];
    fechaInicio: string;
}

export interface EventosPlanificacionResponse {
    eventos: EventoPlanificacion[];
    maxRepeticion: number;
}

export interface ActualizarComandaPlanificacionPayload {
    id: number;
    deshabilitada: boolean;
}

export interface PlatoAdelantado {
    cantidad: number;
    fecha: string | null;
    id: number;
    nombre: string;
}

export interface ActualizarPlatoAdelantadoPayload {
    id: number;
    adelantar: boolean;
}
