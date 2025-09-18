'use client';

import { SalonContext } from '@/components/filtroPlatos';
import { Loading } from '@/components/loading';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useContext, useEffect, useState } from 'react';
import { Accordion, Container, Form, Table } from 'react-bootstrap';

interface Evento {
    Plato: Plato[];
    id: number;
    lugar: string;
    salon: string;
    tipo: string;
    fecha: Date;
    nombre: string;
    horarioInicio: Date;
    horarioFin: Date;
    cantidadMayores: number;
    cantidadMenores: number;
    observaciones: string | null;
}

interface Plato {
    id: number;
    fecha: Date | null;
    nombre: string;
    cantidad: number;
    unidadMedida: string;
    comandaId: number;
    gestionado: boolean;
}

interface Comanda {
    evento: Evento;
    cantidad: number;
}

interface Data {
    semi: string;
    comandas: Comanda[];
}

export default function PickingPage() {
    const salon = useContext(SalonContext);

    const [data, setData] = useState<Data[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroPlato, setFiltroPlato] = useState('');

    useEffect(() => {
        fetch('/api/picking?salon=' + salon)
            .then((res) => res.json())
            .then((data) => {
                setData(data);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [salon]);

    const filterPlato = ({ semi }: { semi: string }) => {
        if (!filtroPlato) return true;

        return semi.toLowerCase().includes(filtroPlato.toLowerCase());
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <Container className="mt-5">
            <h2 className="text-center mb-4">Picking</h2>

            <Form.Group className="mb-5">
                <Form.Label>Buscar Plato</Form.Label>
                <Form.Control
                    type="text"
                    placeholder="Buscar plato ..."
                    onChange={(e) => {
                        setFiltroPlato(e.target.value);
                    }}
                />
            </Form.Group>

            {data.filter(filterPlato).map((plato, i) => (
                <Accordion
                    defaultActiveKey="0"
                    className="mb-3"
                    key={i}>
                    <Accordion.Item eventKey={i.toString()}>
                        <Accordion.Header>{plato.semi}</Accordion.Header>
                        <Accordion.Body>
                            <Table>
                                <thead>
                                    <tr>
                                        <th>Cantidad</th>
                                        {/* <th>Unidad Medida</th> */}
                                        <th>Salon</th>
                                        <th>Nombre</th>
                                        <th>Fecha</th>
                                        <th>Pax Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plato.comandas.map(
                                        ({ cantidad, evento }, i) => {
                                            return (
                                                <tr key={i}>
                                                    <td>
                                                        {cantidad.toFixed(2)}
                                                    </td>
                                                    {/* <td>{}</td> */}
                                                    <td>
                                                        {evento.lugar} -{' '}
                                                        {evento.salon}
                                                    </td>
                                                    <td>{evento.nombre}</td>
                                                    <td>
                                                        {format(
                                                            evento.fecha,
                                                            "EEEE, dd 'de' MMMM",
                                                            { locale: es }
                                                        )}
                                                    </td>
                                                    <td>
                                                        {evento.cantidadMayores +
                                                            evento.cantidadMenores}
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )}
                                </tbody>
                            </Table>
                        </Accordion.Body>
                    </Accordion.Item>
                </Accordion>
            ))}
        </Container>
    );
}
