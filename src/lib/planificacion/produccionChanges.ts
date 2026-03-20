import { format } from 'date-fns';

interface ProduccionBase {
    plato: string;
    platoCodigo: string;
    platoPadre: string;
    platoPadreCodigo: string;
    fecha: string;
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

export function esCambioEliminacion(item: unknown): item is ProduccionDelete {
    const candidate = item as Partial<ProduccionDelete> | null;
    return (
        candidate?.eliminar === true ||
        candidate?.cantidad === null ||
        candidate?.cantidad === ''
    );
}

export function sanitizarProduccionUpdate(items: unknown[]): ProduccionChange[] {
    const porClave = new Map<string, ProduccionChange>();

    for (const item of items) {
        const candidate = item as Record<string, unknown>;
        const plato = String(candidate?.plato ?? '').trim();
        const platoCodigo = String(candidate?.platoCodigo ?? '').trim();
        const platoPadre = String(candidate?.platoPadre ?? '').trim();
        const platoPadreCodigo = String(candidate?.platoPadreCodigo ?? '').trim();
        const fecha = String(candidate?.fecha ?? '').trim();

        if (!platoCodigo || !fecha) {
            continue;
        }

        if (esCambioEliminacion(candidate)) {
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

        const cantidad = Number(candidate?.cantidad);

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
    produccionActual: unknown[],
    cambiosGuardados: ProduccionChange[],
): unknown[] {
    const porClave = new Map<string, unknown>();

    for (const item of produccionActual) {
        const candidate = item as Record<string, unknown>;
        const clave = construirClaveProduccion({
            platoCodigo: String(candidate.platoCodigo ?? ''),
            platoPadreCodigo: String(candidate.platoPadreCodigo ?? ''),
            fecha: String(candidate.fecha ?? ''),
        });
        porClave.set(clave, item);
    }

    for (const item of cambiosGuardados) {
        const clave = construirClaveProduccion(item);

        if (esCambioEliminacion(item)) {
            porClave.delete(clave);
            continue;
        }

        const existente = (porClave.get(clave) ?? {}) as Record<string, unknown>;

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
