'use client';

import { Button, FloatingLabel, Form, Modal } from 'react-bootstrap';

interface ObservacionItem {
    plato: string;
    platoCodigo: string;
    observacion: string;
    platoPadre: string;
    platoPadreCodigo: string;
}

interface ObservacionModalProps {
    show: boolean;
    plato: string;
    platoCodigo: string;
    platoPadre: string;
    platoPadreCodigo: string;
    observacionModal: string;
    observaciones: ObservacionItem[];
    esConsultor: boolean;
    onClose: () => void;
    setObservacionModal: (value: string) => void;
    setObservaciones: (value: ObservacionItem[]) => void;
}

export function ObservacionModal({
    show,
    plato,
    platoCodigo,
    platoPadre,
    platoPadreCodigo,
    observacionModal,
    observaciones,
    esConsultor,
    onClose,
    setObservacionModal,
    setObservaciones,
}: ObservacionModalProps) {
    return (
        <Modal
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
                        value={observacionModal}
                        onChange={(
                            e: React.ChangeEvent<
                                HTMLInputElement | HTMLTextAreaElement
                            >,
                        ) => {
                            setObservacionModal(e.target.value);
                        }}
                        style={{ height: '200px' }}
                    />
                </FloatingLabel>
            </Modal.Body>
            <Modal.Footer>
                <Button
                    variant="secondary"
                    onClick={() => {
                        setObservacionModal('');
                        onClose();
                    }}>
                    Cerrar
                </Button>
                {!esConsultor && (
                    <Button
                        variant="primary"
                        onClick={() => {
                            const obsExistente = observaciones.find(
                                (o) =>
                                    o.platoCodigo === platoCodigo &&
                                    o.platoPadreCodigo === platoPadreCodigo,
                            );
                            if (obsExistente) {
                                obsExistente.observacion = observacionModal;
                                setObservaciones([
                                    ...observaciones.filter(
                                        (o) =>
                                            !(
                                                o.platoCodigo === platoCodigo &&
                                                o.platoPadreCodigo === platoPadreCodigo
                                            ),
                                    ),
                                    obsExistente,
                                ]);
                            } else {
                                setObservaciones([
                                    ...observaciones,
                                    {
                                        plato,
                                        platoCodigo,
                                        platoPadre,
                                        platoPadreCodigo,
                                        observacion: observacionModal,
                                    },
                                ]);
                            }
                            setObservacionModal('');
                            onClose();
                        }}>
                        Guardar Cambios
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
}
