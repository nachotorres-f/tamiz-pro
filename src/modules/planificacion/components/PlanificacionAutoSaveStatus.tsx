'use client';

import { format } from 'date-fns';
import type { EstadoAutoGuardado } from '@/modules/planificacion/types';

export function PlanificacionAutoSaveStatus({
    estado,
    ultimaSincronizacion,
}: {
    estado: EstadoAutoGuardado;
    ultimaSincronizacion: Date | null;
}) {
    return (
        <div
            className={`small mb-3 ${
                estado === 'error' ? 'text-danger' : 'text-muted'
            }`}>
            {estado === 'pending' &&
                'Cambios pendientes de guardado automático...'}
            {estado === 'saving' &&
                'Guardando cambios automáticamente...'}
            {estado === 'saved' &&
                `Guardado automático activo${
                    ultimaSincronizacion
                        ? ` (último guardado ${format(
                              ultimaSincronizacion,
                              'HH:mm:ss',
                          )})`
                        : ''
                }`}
            {estado === 'error' &&
                'Error al guardar automáticamente. Reintentá en unos segundos.'}
            {estado === 'idle' && 'Guardado automático activo.'}
        </div>
    );
}
