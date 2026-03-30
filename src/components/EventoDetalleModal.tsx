'use client';

import { useEffect, useState } from 'react';
import { Alert, Modal, Placeholder } from 'react-bootstrap';
import {
    EventoDetalleContent,
    EventoDetalleSkeleton,
    type EventoDetalle,
} from '@/components/EventoDetalleContent';

function EventoDetalleBody({
    error,
    evento,
    loading,
}: {
    error: string | null;
    evento: EventoDetalle | null;
    loading: boolean;
}) {
    if (loading) {
        return <EventoDetalleSkeleton />;
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    if (!evento) {
        return <Alert variant="warning">Evento no encontrado.</Alert>;
    }

    return <EventoDetalleContent evento={evento} />;
}

export function EventoDetalleModal({
    eventoId,
    onClose,
    show,
}: {
    eventoId: string | null;
    onClose: () => void;
    show: boolean;
}) {
    const [evento, setEvento] = useState<EventoDetalle | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!show || !eventoId) {
            setEvento(null);
            setError(null);
            setLoading(false);
            return;
        }

        const abortController = new AbortController();

        setLoading(true);
        setError(null);
        setEvento(null);

        fetch('/api/evento?id=' + eventoId, {
            signal: abortController.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('No se pudieron cargar los detalles del evento.');
                }
                return response.json();
            })
            .then((data: EventoDetalle | null) => {
                setEvento(data);
            })
            .catch((fetchError: unknown) => {
                if (
                    fetchError instanceof Error &&
                    fetchError.name === 'AbortError'
                ) {
                    return;
                }

                console.error(
                    'Error fetching event details:',
                    fetchError,
                );
                setError('No se pudieron cargar los detalles del evento.');
            })
            .finally(() => {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => {
            abortController.abort();
        };
    }, [eventoId, show]);

    return (
        <Modal
            centered
            scrollable
            size="lg"
            show={show}
            onHide={onClose}>
            <Modal.Header closeButton>
                <Modal.Title>
                    {loading ? (
                        <Placeholder
                            as="span"
                            animation="glow"
                            className="d-inline-block"
                            style={{ width: '14rem' }}>
                            <Placeholder xs={12} />
                        </Placeholder>
                    ) : (
                        evento?.nombre ?? 'Detalle del evento'
                    )}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <EventoDetalleBody
                    error={error}
                    evento={evento}
                    loading={loading}
                />
            </Modal.Body>
        </Modal>
    );
}
