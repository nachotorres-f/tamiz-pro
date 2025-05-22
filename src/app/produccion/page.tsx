/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { FiltroPlatos } from '@/components/filtroPlatos';
import { NavegacionSemanal } from '@/components/navegacionSemanal';
import { SelectorDias } from '@/components/selectorDias';
import { addDays, format, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import { Button, Col, Container, Form, Row, Table } from 'react-bootstrap';
import { FiletypePdf } from 'react-bootstrap-icons';

export default function ProduccionPage() {
    const [filtro, setFiltro] = useState('');
    const [diasSemana, setDiasSemana] = useState<Date[]>([]);
    const [diaActivo, setDiaActivo] = useState('');
    const [semanaBase, setSemanaBase] = useState(new Date());
    const [datos, setDatos] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/produccion')
            .then((res) => res.json())
            .then((res) => res.data)
            .then(setDatos);
    }, []);

    useEffect(() => {
        const inicioSemana = startOfWeek(semanaBase, { weekStartsOn: 0 }); // domingo
        const dias = Array.from({ length: 7 }, (_, i) =>
            addDays(inicioSemana, i)
        );
        setDiasSemana(dias);
        setDiaActivo('');
    }, [semanaBase]);

    const filterDias = (dia: Date) => {
        if (diaActivo && format(dia, 'yyyy-MM-dd') !== diaActivo) {
            return false;
        }

        return true;
    };

    const filterPlatos = (dato: any) => {
        if (!filtro) return true;

        return dato.plato.toLowerCase().includes(filtro.toLowerCase());
    };

    const generarPDF = async () => {};

    return (
        <Container className="mt-5">
            <h2 className="text-center mb-4">Produccion</h2>

            <Form.Group>
                <Row>
                    <Col>
                        <FiltroPlatos
                            filtro={filtro}
                            setFiltro={setFiltro}
                        />
                    </Col>
                    <Col>
                        <SelectorDias
                            diasSemana={diasSemana}
                            setDiaActivo={setDiaActivo}
                        />
                    </Col>
                </Row>
            </Form.Group>

            <NavegacionSemanal
                semanaBase={semanaBase}
                setSemanaBase={setSemanaBase}
            />

            <Table
                bordered
                responsive
                striped>
                <thead className="table-dark">
                    <tr>
                        <th></th>
                        <th>Plato</th>
                        {diasSemana.filter(filterDias).map((dia, idx) => (
                            <th key={idx}>
                                {format(dia, 'EEEE d MMMM', { locale: es })}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {datos &&
                        datos.filter(filterPlatos).map((dato) => (
                            <tr key={dato.plato}>
                                <td>
                                    <Button
                                        className="btn-danger"
                                        size="sm"
                                        style={{
                                            width: '2rem',
                                            height: '2rem',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                        onClick={generarPDF}>
                                        <FiletypePdf />
                                    </Button>
                                </td>
                                <td
                                    className={
                                        dato.principal
                                            ? ''
                                            : 'bg-primary-subtle'
                                    }>
                                    {dato.plato}
                                </td>

                                {diasSemana.filter(filterDias).map((dia, i) => {
                                    dia.setHours(0, 0, 0, 0);

                                    const produccion = dato.produccion.find(
                                        (prod: any) => {
                                            const fecha = new Date(prod.fecha);
                                            fecha.setHours(0, 0, 0, 0);

                                            return (
                                                fecha.getTime() ===
                                                dia.getTime()
                                            );
                                        }
                                    );
                                    const cantidad = produccion
                                        ? produccion.cantidad
                                        : 0;
                                    return (
                                        <td
                                            key={i}
                                            className={
                                                cantidad > 0
                                                    ? 'bg-danger-subtle'
                                                    : ''
                                            }>
                                            {cantidad || ''}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                </tbody>
            </Table>
        </Container>
    );
}
