'use client';

import { SalonContext } from '@/components/filtroPlatos';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useContext, useEffect, useState } from 'react';
import { Accordion, Container, Table } from 'react-bootstrap';
import { MoonLoader } from 'react-spinners';

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

    useEffect(() => {
        fetch('/api/picking?salon=' + salon)
            .then((res) => res.json())
            .then((data) => {
                setData(data);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <>
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 9999,
                    }}>
                    <MoonLoader
                        color="#fff"
                        speedMultiplier={0.5}
                    />
                </div>
            </>
        );
    }

    return (
        <Container className="mt-5">
            <h2 className="text-center mb-4">Picking</h2>

            {data.map((plato, i) => (
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
