'use client';

import { Button, Form, Modal, Spinner, Table } from 'react-bootstrap';
import type { PlatoAdelantado } from '@/modules/planificacion/types';

export function PlanificacionAdelantoModal({
    accionMasivaAdelanto,
    adelantandoTodo,
    cargandoPlatos,
    cerrandoModal,
    container,
    onClose,
    onToggleAdelantoTodo,
    onTogglePlato,
    platos,
    platosGuardandoIds,
    show,
    todosAdelantados,
}: {
    accionMasivaAdelanto: 'adelantar' | 'desadelantar' | null;
    adelantandoTodo: boolean;
    cargandoPlatos: boolean;
    cerrandoModal: boolean;
    container?: HTMLElement;
    onClose: () => void;
    onToggleAdelantoTodo: () => void;
    onTogglePlato: (
        platoId: number,
        adelantar: boolean,
        fechaAnterior: string | null,
    ) => void;
    platos: PlatoAdelantado[];
    platosGuardandoIds: Set<number>;
    show: boolean;
    todosAdelantados: boolean;
}) {
    const bloqueado =
        cerrandoModal || adelantandoTodo || platosGuardandoIds.size > 0;

    return (
        <Modal
            container={container}
            size="lg"
            show={show}
            onHide={onClose}>
            <Modal.Header closeButton>
                <Modal.Title>Adelantar Plato Evento</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {cargandoPlatos ? (
                    <div className="d-flex align-items-center gap-2 text-muted">
                        <Spinner
                            animation="border"
                            size="sm"
                        />
                        <span>Cargando platos...</span>
                    </div>
                ) : platos.length > 0 ? (
                    <>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <small className="text-muted">
                                {bloqueado
                                    ? 'Actualizando adelantos y planificación...'
                                    : 'Marcá los platos que querés adelantar para ver el impacto en la tabla.'}
                            </small>
                            <Button
                                size="sm"
                                variant="primary"
                                disabled={bloqueado}
                                onClick={onToggleAdelantoTodo}>
                                {adelantandoTodo
                                    ? accionMasivaAdelanto === 'desadelantar'
                                        ? 'Quitando adelantos...'
                                        : 'Adelantando...'
                                    : todosAdelantados
                                      ? 'Quitar adelanto a todo'
                                      : 'Adelantar todo'}
                            </Button>
                        </div>
                        <Table>
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Cantidad</th>
                                    <th>Adelantar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {platos.map((plato) => (
                                    <tr key={plato.id}>
                                        <td>{plato.nombre}</td>
                                        <td>{plato.cantidad}</td>
                                        <td>
                                            <Form.Check
                                                type="checkbox"
                                                checked={!!plato.fecha}
                                                disabled={
                                                    bloqueado ||
                                                    platosGuardandoIds.has(
                                                        plato.id,
                                                    )
                                                }
                                                onChange={(event) => {
                                                    onTogglePlato(
                                                        plato.id,
                                                        event.target.checked,
                                                        plato.fecha,
                                                    );
                                                }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </>
                ) : (
                    <p>No hay platos para adelantar.</p>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button
                    variant="secondary"
                    disabled={bloqueado}
                    onClick={onClose}>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
