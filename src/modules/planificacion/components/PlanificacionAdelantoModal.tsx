'use client';

import { Button, Form, Modal, Placeholder, Table } from 'react-bootstrap';
import type { PlatoAdelantado } from '@/modules/planificacion/types';

function PlaceholderLine({
    width,
}: {
    width: string;
}) {
    return (
        <Placeholder
            as="span"
            animation="glow"
            className="d-inline-block align-middle"
            style={{ width }}>
            <Placeholder xs={12} />
        </Placeholder>
    );
}

function PlanificacionAdelantoSkeleton() {
    return (
        <>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="flex-grow-1 pe-3">
                    <PlaceholderLine width="70%" />
                </div>
                <Placeholder
                    as="span"
                    animation="glow"
                    className="d-inline-block"
                    style={{ width: '8rem', height: '31px' }}>
                    <Placeholder xs={12} />
                </Placeholder>
            </div>
            <Table
                bordered
                striped
                size="sm"
                className="mb-0">
                <thead className="table-dark">
                    <tr>
                        <th>Código</th>
                        <th className="text-start">Plato</th>
                        <th>Cantidad</th>
                        <th className="text-center">Adelantar</th>
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: 15 }).map((_, index) => (
                        <tr key={index}>
                            <td>
                                <PlaceholderLine width="55%" />
                            </td>
                            <td className="text-start">
                                <PlaceholderLine width="80%" />
                            </td>
                            <td>
                                <PlaceholderLine width="35%" />
                            </td>
                            <td className="text-center">
                                <div className="d-flex justify-content-center">
                                    <Placeholder
                                        as="span"
                                        animation="glow"
                                        className="d-inline-block rounded"
                                        style={{
                                            width: '1rem',
                                            height: '1rem',
                                        }}>
                                        <Placeholder xs={12} />
                                    </Placeholder>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </>
    );
}

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
            centered
            container={container}
            scrollable
            size="lg"
            show={show}
            onHide={onClose}>
            <Modal.Header closeButton>
                <Modal.Title>Adelantar Plato Evento</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {cargandoPlatos ? (
                    <PlanificacionAdelantoSkeleton />
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
                        <Table
                            bordered
                            striped
                            size="sm"
                            className="mb-0">
                            <thead className="table-dark">
                                <tr>
                                    <th>Código</th>
                                    <th className="text-start">Plato</th>
                                    <th>Cantidad</th>
                                    <th className="text-center">Adelantar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {platos.map((plato) => (
                                    <tr key={plato.id}>
                                        <td>{plato.codigo || '-'}</td>
                                        <td className="text-start">
                                            {plato.nombre}
                                        </td>
                                        <td>{plato.cantidad}</td>
                                        <td className="text-center">
                                            <div className="d-flex justify-content-center">
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
                                            </div>
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
