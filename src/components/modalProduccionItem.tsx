/* eslint-disable @typescript-eslint/no-explicit-any */
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

export function ModalProduccionItem({ show, handleClose, nombre }: any) {
    return (
        <>
            <Modal
                show={show}
                onHide={handleClose}
                size="xl">
                <Modal.Header closeButton>
                    <Modal.Title>Produccion - {nombre}</Modal.Title>
                </Modal.Header>
                <Modal.Body></Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={handleClose}>
                        Cerrar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleClose}>
                        Guardar Cambios
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}
