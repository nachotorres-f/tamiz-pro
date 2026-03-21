import { format } from 'date-fns';
import type { CSSProperties } from 'react';

export type OpcionFiltro = {
    label: string;
    value: string;
};

export type DiaVisible = {
    dia: Date;
    fechaClave: string;
    indexOriginal: number;
};

export type BadgeCelda = {
    className: string;
    draggable?: boolean;
    texto: string;
    title: string;
    value?: number;
};

export type CeldaPlanificacionModel = {
    badgeDerecho: BadgeCelda | null;
    cellKey: string;
    fechaClave: string;
    indexOriginal: number;
    placeholderArrastrable: boolean;
    totalConsumo: number;
    updateCant: boolean;
    valorInput: number | string;
};

export type FilaPlanificacionModel = {
    cells: CeldaPlanificacionModel[];
    claseColorTotal: string;
    observacionActual: string;
    plato: string;
    platoCodigo: string;
    platoPadre: string;
    platoPadreCodigo: string;
    rowBackgroundColor: string;
    rowKey: string;
    totalNecesario: number;
};

export type DragCantidadPayload = {
    mode: 'set' | 'add';
    platoCodigo: string;
    platoPadreCodigo: string;
    value: number;
};

export type GuardarEdicionCeldaInput = {
    celdaKey: string;
    fecha: string;
    plato: string;
    platoCodigo: string;
    platoPadre: string;
    platoPadreCodigo: string;
};

export type StyleStickyFn = (
    columnIndex: number,
    backgroundColor: string,
    extra?: CSSProperties,
) => CSSProperties;

export type StyleHeaderStickyFn = (
    columnIndex: number,
    headerIndex: number,
    backgroundColor: string,
    extra?: CSSProperties,
) => CSSProperties;

export type StyleHeaderDiaFn = (
    headerIndex: number,
    backgroundColor: string,
    extra?: CSSProperties,
) => CSSProperties;

export const HEIGHT_TD = '3rem';
export const HEIGHT_HEADER_DIAS = '2.25rem';
export const STICKY_COLUMN_WIDTHS = ['3.5rem', '15rem', '15rem', '7rem'] as const;
export const ANCHO_DIA = '15rem';

export function abreviar(lugar: string) {
    if (lugar === 'El Central') return 'CEN';
    if (lugar === 'La Rural') return 'RUR';
    if (lugar === 'Rüt Haus') return 'RUT';
    if (lugar === 'Origami') return 'ORI';
}

export function normalizarFechaInicioDia(fecha: string | Date) {
    const normalizada = new Date(fecha);
    normalizada.setHours(0, 0, 0, 0);
    return normalizada;
}

export function normalizarFechaProduccion(fecha: string | Date) {
    const normalizada = normalizarFechaInicioDia(fecha);
    normalizada.setDate(normalizada.getDate() + 1);
    return normalizada;
}

export function obtenerClaveDia(fecha: string | Date, esFechaProduccion = false) {
    const normalizada = esFechaProduccion
        ? normalizarFechaProduccion(fecha)
        : normalizarFechaInicioDia(fecha);
    return format(normalizada, 'yyyy-MM-dd');
}

export function sumarCantidad(items: Array<{ cantidad?: number | string | null }>) {
    return Number(
        items
            .reduce((sum, item) => sum + Number(item.cantidad ?? 0), 0)
            .toFixed(2),
    );
}

export function construirValorFiltro(codigo: string, nombre: string) {
    return `${codigo}|||${nombre}`;
}

export function construirClaveFila(
    platoCodigo: string,
    platoPadreCodigo: string,
) {
    return `${platoCodigo}|||${platoPadreCodigo}`;
}

export function construirClaveCelda(filaKey: string, fechaClave: string) {
    return `${filaKey}|||${fechaClave}`;
}

export function esperarSiguientePintado() {
    return new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
            window.setTimeout(resolve, 0);
        });
    });
}
