import { format } from 'date-fns';
import type {
    ProduccionChange,
    ProduccionDelete,
    ProduccionEdit,
    ProduccionPlanificacion,
} from '@/modules/planificacion/types';

export function normalizarFechaProduccion(fecha: string | Date): string {
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

export function esCambioEliminacion(
    item: unknown,
): item is ProduccionDelete {
    if (!item || typeof item !== 'object') {
        return false;
    }

    const posibleCambio = item as Partial<ProduccionDelete>;

    return (
        posibleCambio.eliminar === true ||
        posibleCambio.cantidad === null ||
        posibleCambio.cantidad === ''
    );
}

export function sanitizarProduccionUpdate(
    items: unknown[],
): ProduccionChange[] {
    const porClave = new Map<string, ProduccionChange>();

    for (const item of items) {
        if (!item || typeof item !== 'object') {
            continue;
        }

        const cambio = item as Partial<ProduccionChange>;
        const plato = String(cambio.plato ?? '').trim();
        const platoCodigo = String(cambio.platoCodigo ?? '').trim();
        const platoPadre = String(cambio.platoPadre ?? '').trim();
        const platoPadreCodigo = String(cambio.platoPadreCodigo ?? '').trim();
        const fecha = String(cambio.fecha ?? '').trim();

        if (!platoCodigo || !fecha) {
            continue;
        }

        if (esCambioEliminacion(cambio)) {
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

        const cantidad = Number(cambio.cantidad);

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
    produccionActual: ProduccionPlanificacion[],
    cambiosGuardados: ProduccionChange[],
): ProduccionPlanificacion[] {
    const porClave = new Map<string, ProduccionPlanificacion>();

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

        const existente = porClave.get(clave);
        const base: Partial<ProduccionPlanificacion> = existente ?? {};

        porClave.set(clave, {
            ...base,
            plato: item.plato,
            platoCodigo: item.platoCodigo,
            platoPadre: item.platoPadre,
            platoPadreCodigo: item.platoPadreCodigo,
            fecha: item.fecha,
            cantidad: item.cantidad,
            esAnteriorACiclo: false,
        } as ProduccionPlanificacion);
    }

    return Array.from(porClave.values());
}
