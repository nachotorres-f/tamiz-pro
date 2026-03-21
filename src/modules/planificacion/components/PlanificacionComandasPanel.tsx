'use client';

import { format } from 'date-fns';
import { Form } from 'react-bootstrap';
import type { EventoPlanificacion } from '@/modules/planificacion/types';

export function PlanificacionComandasPanel({
    actualizandoComandaId,
    comandasCiclo,
    onToggleComanda,
    rol,
}: {
    actualizandoComandaId: number | null;
    comandasCiclo: EventoPlanificacion[];
    onToggleComanda: (comandaId: number, habilitada: boolean) => void;
    rol: string | null;
}) {
    return (
        <div className="border rounded p-2 bg-light">
            <div className="fw-semibold">Comandas del ciclo</div>
            <div className="text-muted small mb-2">
                Desactivá una comanda para excluir sus platos del cálculo.
                Volvé a activarla para revertir cambios.
            </div>
            {comandasCiclo.length === 0 ? (
                <div className="text-muted small">
                    No hay comandas para el ciclo seleccionado.
                </div>
            ) : (
                <div
                    style={{
                        maxHeight: '7rem',
                        overflowY: 'auto',
                    }}>
                    {comandasCiclo.map((comanda) => {
                        const deshabilitada =
                            comanda.deshabilitadaPlanificacion;

                        return (
                            <Form.Check
                                key={comanda.id}
                                type="switch"
                                id={`comanda-ciclo-${comanda.id}`}
                                className="mb-1"
                                checked={!deshabilitada}
                                disabled={
                                    actualizandoComandaId === comanda.id ||
                                    rol === 'consultor'
                                }
                                onChange={(event) => {
                                    onToggleComanda(
                                        comanda.id,
                                        event.target.checked,
                                    );
                                }}
                                label={`${format(new Date(comanda.fecha), 'd/M')} - ${comanda.lugar} - ${comanda.cantidadInvitados} - ${comanda.nombre}`}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
