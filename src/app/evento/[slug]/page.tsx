'use client';

import { useParams } from 'next/navigation';
import React, { useEffect } from 'react';
import { Card, Col, Container, ListGroup, Row, Table } from 'react-bootstrap';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Evento = {
    nombre: string;
    lugar: string;
    salon: string;
    tipo: string;
    fecha: string;
    observaciones: string;
    Plato: { id: number; nombre: string; cantidad: number }[];
};

export default function EventoPage() {
    const params = useParams();
    const { slug } = params;
    const [evento, setData] = React.useState<Evento | null>(null);

    useEffect(() => {
        fetch('/api/evento?id=' + slug)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Evento no encontrado');
                }
                return response.json();
            })
            .then((data) => {
                // Aquí puedes manejar los datos del evento, por ejemplo, guardarlos en el estado
                setData(data);
                console.log('Detalles del evento:', data);
            })
            .catch((error) => {
                console.error('Error fetching event details:', error);
                // Aquí puedes redirigir o mostrar un mensaje de error
            });
    }, [slug]);

    return (
        <Container className="my-4">
            <Row className="justify-content-center">
                <Col md={8}>
                    {evento ? (
                        <>
                            <Card>
                                <Card.Header as="h4">
                                    {evento.nombre}
                                </Card.Header>
                                <ListGroup variant="flush">
                                    <ListGroup.Item>
                                        <strong>Lugar:</strong> {evento.lugar}
                                    </ListGroup.Item>
                                    <ListGroup.Item>
                                        <strong>Salón:</strong> {evento.salon}
                                    </ListGroup.Item>
                                    <ListGroup.Item>
                                        <strong>Tipo:</strong> {evento.tipo}
                                    </ListGroup.Item>
                                    <ListGroup.Item>
                                        <strong>Fecha:</strong>{' '}
                                        {format(
                                            new Date(evento.fecha),
                                            'EEEE dd MMMM yyyy',
                                            { locale: es }
                                        )}
                                    </ListGroup.Item>
                                    <ListGroup.Item>
                                        <strong>Observaciones:</strong>{' '}
                                        {evento.observaciones}
                                    </ListGroup.Item>
                                </ListGroup>
                            </Card>

                            <Table
                                bordered
                                striped
                                size="sm"
                                className="mt-5">
                                <thead className="table-dark">
                                    <tr style={{ textAlign: 'center' }}>
                                        <th>Plato</th>
                                        <th>Cantidad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {evento.Plato.map((plato) => (
                                        <tr key={plato.nombre}>
                                            <td>{plato.nombre}</td>
                                            <td>{plato.cantidad}</td>
                                        </tr>
                                    ))}
                                    {evento.Plato.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={2}
                                                className="text-center">
                                                No hay platos asignados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </>
                    ) : (
                        <div>Cargando evento...</div>
                    )}
                </Col>
            </Row>
        </Container>
    );
}
