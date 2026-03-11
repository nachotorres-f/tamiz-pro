/* eslint-disable @typescript-eslint/no-explicit-any */
import { format } from 'date-fns';

interface ProduccionBase {
    plato: string;
    platoCodigo: string;
    platoPadre: string;
    platoPadreCodigo: string;
    fecha: string;
}

interface ProduccionEdit extends ProduccionBase {
    cantidad: number;
    eliminar?: false;
}

interface ProduccionDelete extends ProduccionBase {
    cantidad: null;
    eliminar: true;
}

export type ProduccionChange = ProduccionEdit | ProduccionDelete;

function normalizarFechaProduccion(fecha: string | Date): string {
    const normalizada = new Date(fecha);

    if (!Number.isFinite(normalizada.getTime())) {
        return String(fecha);
    }

    normalizada.setHours(0, 0, 0, 0);
    normalizada.setDate(normalizada.getDate() + 1);

    return format(normalizada, 'yyyy-MM-dd');
}

export function construirClaveProduccion(item: {
    platoCodigo: string;
    platoPadreCodigo: string;
    fecha: string | Date;
}): string {
    return `${item.platoCodigo}|||${item.platoPadreCodigo}|||${normalizarFechaProduccion(item.fecha)}`;
}

export function esCambioEliminacion(item: any): item is ProduccionDelete {
    return item?.eliminar === true || item?.cantidad === null || item?.cantidad === '';
}

export function sanitizarProduccionUpdate(items: any[]): ProduccionChange[] {
    const porClave = new Map<string, ProduccionChange>();

    for (const item of items) {
        const plato = String(item?.plato ?? '').trim();
        const platoCodigo = String(item?.platoCodigo ?? '').trim();
        const platoPadre = String(item?.platoPadre ?? '').trim();
        const platoPadreCodigo = String(item?.platoPadreCodigo ?? '').trim();
        const fecha = String(item?.fecha ?? '').trim();

        if (!platoCodigo || !fecha) {
            continue;
        }

        if (esCambioEliminacion(item)) {
            const normalizado: ProduccionDelete = {
                plato,
                platoCodigo,
                platoPadre,
                platoPadreCodigo,
                fecha,
                cantidad: null,
                eliminar: true,
            };
            porClave.set(construirClaveProduccion(normalizado), normalizado);
            continue;
        }

        const cantidad = Number(item?.cantidad);

        if (!Number.isFinite(cantidad)) {
            continue;
        }

        const normalizado: ProduccionEdit = {
            plato,
            platoCodigo,
            platoPadre,
            platoPadreCodigo,
            fecha,
            cantidad: Number(cantidad.toFixed(2)),
            eliminar: false,
        };

        porClave.set(construirClaveProduccion(normalizado), normalizado);
    }

    return Array.from(porClave.values());
}

export function construirFirmaProduccion(items: ProduccionChange[]): string {
    return items
        .map((item) =>
            esCambioEliminacion(item)
                ? `${construirClaveProduccion(item)}=DELETE`
                : `${construirClaveProduccion(item)}=${item.cantidad.toFixed(2)}`,
        )
        .sort()
        .join('|');
}

export function mergeProduccionGuardada(
    produccionActual: any[],
    cambiosGuardados: ProduccionChange[],
): any[] {
    const porClave = new Map<string, any>();

    for (const item of produccionActual) {
        const clave = construirClaveProduccion({
            platoCodigo: item.platoCodigo,
            platoPadreCodigo: item.platoPadreCodigo,
            fecha: item.fecha,
        });
        porClave.set(clave, item);
    }

    for (const item of cambiosGuardados) {
        const clave = construirClaveProduccion(item);

        if (esCambioEliminacion(item)) {
            porClave.delete(clave);
            continue;
        }

        const existente = porClave.get(clave) ?? {};

        porClave.set(clave, {
            ...existente,
            plato: item.plato,
            platoCodigo: item.platoCodigo,
            platoPadre: item.platoPadre,
            platoPadreCodigo: item.platoPadreCodigo,
            fecha: item.fecha,
            cantidad: item.cantidad,
        });
    }

    return Array.from(porClave.values());
}
