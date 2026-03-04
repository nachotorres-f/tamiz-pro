import { prisma } from '@/lib/prisma';

export type AuditModulo =
    | 'planificacion'
    | 'produccion'
    | 'entrega_mp'
    | 'picking'
    | 'expedicion'
    | 'comandas'
    | 'recetas'
    | 'sistema';

interface LogAuditInput {
    modulo: AuditModulo;
    accion: string;
    ruta: string;
    metodo: string;
    estado?: 'success' | 'error' | 'warning';
    resumen?: string;
    detalle?: unknown;
}

const MAX_DETALLE_LENGTH = 20000;

function serializeDetalle(value: unknown): string {
    try {
        const raw = JSON.stringify(
            value,
            (_key, current) => {
                if (typeof current === 'bigint') {
                    return current.toString();
                }

                if (current instanceof Date) {
                    return current.toISOString();
                }

                return current;
            },
            2,
        );

        if (raw.length <= MAX_DETALLE_LENGTH) {
            return raw;
        }

        return `${raw.slice(0, MAX_DETALLE_LENGTH)}\n...<truncated>`;
    } catch {
        return String(value);
    }
}

export async function logAudit({
    modulo,
    accion,
    ruta,
    metodo,
    estado = 'success',
    resumen,
    detalle,
}: LogAuditInput): Promise<void> {
    if (process.env.AUDIT_LOG_ENABLED === 'false') {
        return;
    }

    try {
        await prisma.auditLog.create({
            data: {
                modulo,
                accion,
                ruta,
                metodo,
                estado,
                resumen: resumen?.slice(0, 10000),
                detalle:
                    detalle === undefined ? null : serializeDetalle(detalle),
            },
        });
    } catch (error) {
        console.error('[audit] Error guardando log:', error);
    }
}
