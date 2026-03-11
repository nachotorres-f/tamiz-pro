/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Button, Form, Modal, Spinner, Table } from 'react-bootstrap';

interface AdelantarEventoModalProps {
    show: boolean;
    cargando: boolean;
    platos: any[];
    adelantandoTodo: boolean;
    accionMasivaAdelanto: 'adelantar' | 'desadelantar' | null;
    platosGuardandoAdelantoSize: number;
    cerrando: boolean;
    todosAdelantados: boolean;
    onClose: () => void;
    onToggleTodo: () => void;
    onTogglePlato: (plato: any, checked: boolean) => void;
}

export function AdelantarEventoModal({
    show,
    cargando,
    platos,
    adelantandoTodo,
    accionMasivaAdelanto,
    platosGuardandoAdelantoSize,
    cerrando,
    todosAdelantados,
    onClose,
    onToggleTodo,
    onTogglePlato,
}: AdelantarEventoModalProps) {
    return (
        <Modal
            size="lg"
            show={show}
            onHide={onClose}>
            <Modal.Header closeButton>
                <Modal.Title>Adelantar Plato Evento</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {cargando ? (
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
                                {adelantandoTodo || platosGuardandoAdelantoSize > 0
                                    ? 'Actualizando adelantos y planificación...'
                                    : 'Marcá los platos que querés adelantar para ver el impacto en la tabla.'}
                            </small>
                            <Button
                                size="sm"
                                variant="primary"
                                disabled={
                                    cerrando ||
                                    adelantandoTodo ||
                                    platosGuardandoAdelantoSize > 0
                                }
                                onClick={onToggleTodo}>
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
                                                    adelantandoTodo ||
                                                    platosGuardandoAdelantoSize > 0
                                                }
                                                onChange={(e) =>
                                                    onTogglePlato(
                                                        plato,
                                                        e.target.checked,
                                                    )
                                                }
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </>
                ) : (
                    <div className="text-muted">No hay platos para adelantar.</div>
                )}
            </Modal.Body>
        </Modal>
    );
}
