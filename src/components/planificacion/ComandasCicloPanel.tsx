import { Form } from 'react-bootstrap';
import { format } from 'date-fns';
import type { EventoPlanificacion } from '@/lib/planificacion/types';

interface ComandasCicloPanelProps {
    comandasCiclo: EventoPlanificacion[];
    actualizandoComandaId: number | null;
    esConsultor: boolean;
    onToggleComanda: (comandaId: number, habilitada: boolean) => void;
}

export function ComandasCicloPanel({
    comandasCiclo,
    actualizandoComandaId,
    esConsultor,
    onToggleComanda,
}: ComandasCicloPanelProps) {
    return (
        <div className="border rounded p-2 bg-light">
            <div className="fw-semibold">Comandas del ciclo</div>
            <div className="text-muted small mb-2">
                Desactivá una comanda para excluir sus platos del cálculo. Volvé
                a activarla para revertir cambios.
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
                        const deshabilitada = comanda.deshabilitadaPlanificacion;
                        return (
                            <Form.Check
                                key={comanda.id}
                                type="switch"
                                id={`comanda-ciclo-${comanda.id}`}
                                className="mb-1"
                                checked={!deshabilitada}
                                disabled={
                                    actualizandoComandaId === comanda.id ||
                                    esConsultor
                                }
                                onChange={(e) =>
                                    onToggleComanda(comanda.id, e.target.checked)
                                }
                                label={`${format(new Date(comanda.fecha), 'dd/MM/yyyy')} - ${comanda.lugar} - ${comanda.salon} - ${comanda.nombre}`}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
