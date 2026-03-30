'use client';

import { Card, ListGroup, Placeholder, Table } from 'react-bootstrap';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export type EventoDetalle = {
    id: number;
    nombre: string;
    lugar: string;
    salon: string;
    tipo: string;
    fecha: string;
    observaciones: string | null;
    Plato: { id: number; codigo: string; nombre: string; cantidad: number }[];
};

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

export function EventoDetalleSkeleton() {
    return (
        <>
            <Card>
                <ListGroup variant="flush">
                    <ListGroup.Item>
                        <strong>Lugar:</strong> <PlaceholderLine width="45%" />
                    </ListGroup.Item>
                    <ListGroup.Item>
                        <strong>Salón:</strong> <PlaceholderLine width="30%" />
                    </ListGroup.Item>
                    <ListGroup.Item>
                        <strong>Tipo:</strong> <PlaceholderLine width="40%" />
                    </ListGroup.Item>
                    <ListGroup.Item>
                        <strong>Fecha:</strong> <PlaceholderLine width="60%" />
                    </ListGroup.Item>
                    <ListGroup.Item>
                        <strong>Observaciones:</strong>{' '}
                        <div className="mt-2">
                            <PlaceholderLine width="100%" />
                        </div>
                        <div>
                            <PlaceholderLine width="75%" />
                        </div>
                    </ListGroup.Item>
                </ListGroup>
            </Card>

            <Table
                bordered
                striped
                size="sm"
                className="mt-4 mb-0">
                <thead className="table-dark">
                    <tr>
                        <th>Código</th>
                        <th className="text-start">Plato</th>
                        <th>Cantidad</th>
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: 3 }).map((_, index) => (
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
                        </tr>
                    ))}
                </tbody>
            </Table>
        </>
    );
}

export function EventoDetalleContent({
    evento,
}: {
    evento: EventoDetalle;
}) {
    const observaciones = evento.observaciones?.trim() || 'Sin observaciones.';

    return (
        <>
            <Card>
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
                        {format(new Date(evento.fecha), 'EEEE dd MMMM yyyy', {
                            locale: es,
                        })}
                    </ListGroup.Item>
                    <ListGroup.Item>
                        <strong>Observaciones:</strong> {observaciones}
                    </ListGroup.Item>
                </ListGroup>
            </Card>

            <Table
                bordered
                striped
                size="sm"
                className="mt-4 mb-0">
                <thead className="table-dark">
                    <tr>
                        <th>Código</th>
                        <th className="text-start">Plato</th>
                        <th>Cantidad</th>
                    </tr>
                </thead>
                <tbody>
                    {evento.Plato.map((plato) => (
                        <tr key={plato.id}>
                            <td>{plato.codigo || '-'}</td>
                            <td className="text-start">{plato.nombre}</td>
                            <td>{plato.cantidad}</td>
                        </tr>
                    ))}
                    {evento.Plato.length === 0 && (
                        <tr>
                            <td
                                colSpan={3}
                                className="text-center">
                                No hay platos asignados.
                            </td>
                        </tr>
                    )}
                </tbody>
            </Table>
        </>
    );
}
