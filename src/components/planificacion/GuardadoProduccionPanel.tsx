'use client';

import { format } from 'date-fns';
import { Button } from 'react-bootstrap';

interface GuardadoProduccionPanelProps {
    estadoAutoGuardado: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
    ultimaSincronizacion: Date | null;
    onGuardar: () => void;
    onLimpiar: () => void;
}

export function GuardadoProduccionPanel({
    estadoAutoGuardado,
    ultimaSincronizacion,
    onGuardar,
    onLimpiar,
}: GuardadoProduccionPanelProps) {
    return (
        <>
            <Button
                type="button"
                className="btn btn-success mb-3"
                onClick={onGuardar}>
                Guardar Cambios
            </Button>
            <Button
                type="button"
                className="btn btn-primary mb-3 ms-2"
                onClick={onLimpiar}>
                Limpiar cambios
            </Button>
            <div
                className={`small mb-3 ${
                    estadoAutoGuardado === 'error' ? 'text-danger' : 'text-muted'
                }`}>
                {estadoAutoGuardado === 'pending' &&
                    'Cambios pendientes de guardado automático...'}
                {estadoAutoGuardado === 'saving' &&
                    'Guardando cambios automáticamente...'}
                {estadoAutoGuardado === 'saved' &&
                    `Guardado automático activo${
                        ultimaSincronizacion
                            ? ` (último guardado ${format(ultimaSincronizacion, 'HH:mm:ss')})`
                            : ''
                    }`}
                {estadoAutoGuardado === 'error' &&
                    'Error al guardar automáticamente. Podés usar "Guardar Cambios".'}
                {estadoAutoGuardado === 'idle' && 'Guardado automático activo.'}
            </div>
        </>
    );
}
