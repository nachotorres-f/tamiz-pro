import { Button, FloatingLabel, Form, Modal } from 'react-bootstrap';

interface ObservacionPlatoModalProps {
    show: boolean;
    plato: string;
    platoPadre: string;
    observacion: string;
    esConsultor: boolean;
    onClose: () => void;
    onChangeObservacion: (value: string) => void;
    onGuardar: () => void;
}

export function ObservacionPlatoModal({
    show,
    plato,
    platoPadre,
    observacion,
    esConsultor,
    onClose,
    onChangeObservacion,
    onGuardar,
}: ObservacionPlatoModalProps) {
    return (
        <Modal show={show} onHide={onClose}>
            <Modal.Header closeButton>
                <Modal.Title>
                    Observacion - {plato} - {platoPadre}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <FloatingLabel
                    controlId="floatingTextarea"
                    label="Observación"
                    className="mb-3">
                    <Form.Control
                        as="textarea"
                        value={observacion}
                        onChange={(e) => onChangeObservacion(e.target.value)}
                        style={{ height: '200px' }}
                    />
                </FloatingLabel>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>
                    Cerrar
                </Button>
                {!esConsultor && (
                    <Button variant="primary" onClick={onGuardar}>
                        Guardar Cambios
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
}
