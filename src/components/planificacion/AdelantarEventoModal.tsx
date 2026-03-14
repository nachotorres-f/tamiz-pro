import { Button, Form, Modal, Spinner, Table } from 'react-bootstrap';

interface PlatoAdelantado {
    id: number;
    nombre: string;
    cantidad: number;
    fecha: string | Date | null;
}

interface AdelantarEventoModalProps {
    show: boolean;
    cargando: boolean;
    platos: PlatoAdelantado[];
    cerrando: boolean;
    adelantandoTodo: boolean;
    accionMasivaAdelanto: 'adelantar' | 'desadelantar' | null;
    platosGuardandoAdelanto: Set<number>;
    todosAdelantados: boolean;
    onClose: () => void;
    onToggleTodo: () => void;
    onTogglePlato: (plato: PlatoAdelantado, checked: boolean) => void;
}

export function AdelantarEventoModal({
    show,
    cargando,
    platos,
    cerrando,
    adelantandoTodo,
    accionMasivaAdelanto,
    platosGuardandoAdelanto,
    todosAdelantados,
    onClose,
    onToggleTodo,
    onTogglePlato,
}: AdelantarEventoModalProps) {
    return (
        <Modal size="lg" show={show} onHide={onClose}>
            <Modal.Header closeButton>
                <Modal.Title>Adelantar Plato Evento</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {cargando ? (
                    <div className="d-flex align-items-center gap-2 text-muted">
                        <Spinner animation="border" size="sm" />
                        <span>Cargando platos...</span>
                    </div>
                ) : platos.length > 0 ? (
                    <>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <small className="text-muted">
                                {adelantandoTodo || platosGuardandoAdelanto.size > 0
                                    ? 'Actualizando adelantos y planificación...'
                                    : 'Marcá los platos que querés adelantar para ver el impacto en la tabla.'}
                            </small>
                            <Button
                                size="sm"
                                variant="primary"
                                disabled={
                                    cerrando ||
                                    adelantandoTodo ||
                                    platosGuardandoAdelanto.size > 0
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
                                                    cerrando ||
                                                    adelantandoTodo ||
                                                    platosGuardandoAdelanto.has(plato.id)
                                                }
                                                onChange={(e) =>
                                                    onTogglePlato(plato, e.target.checked)
                                                }
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
                    disabled={
                        cerrando || adelantandoTodo || platosGuardandoAdelanto.size > 0
                    }
                    onClick={onClose}>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
