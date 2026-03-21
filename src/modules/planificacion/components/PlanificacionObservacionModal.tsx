'use client';

import { Button, FloatingLabel, Form, Modal } from 'react-bootstrap';

export function PlanificacionObservacionModal({
    canEdit,
    container,
    observacion,
    onChangeObservacion,
    onClose,
    onSave,
    plato,
    platoPadre,
    show,
}: {
    canEdit: boolean;
    container?: HTMLElement;
    observacion: string;
    onChangeObservacion: (value: string) => void;
    onClose: () => void;
    onSave: () => void;
    plato: string;
    platoPadre: string;
    show: boolean;
}) {
    return (
        <Modal
            container={container}
            show={show}
            onHide={onClose}>
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
                        onChange={(event) => {
                            onChangeObservacion(event.target.value);
                        }}
                        style={{ height: '200px' }}
                    />
                </FloatingLabel>
            </Modal.Body>
            <Modal.Footer>
                <Button
                    variant="secondary"
                    onClick={onClose}>
                    Cerrar
                </Button>
                {canEdit && (
                    <Button
                        variant="primary"
                        onClick={onSave}>
                        Guardar Cambios
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
}
