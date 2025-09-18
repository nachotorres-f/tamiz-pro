/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useContext, useState } from 'react';
import { useEffect } from 'react';

import { Accordion, Container, Form, Table } from 'react-bootstrap';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import esLocale from '@fullcalendar/core/locales/es';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SalonContext } from '@/components/filtroPlatos';
import { Loading } from '@/components/loading';

export default function ExpedicionPage() {
    const salon = useContext(SalonContext);

    const [events, setEvents] = React.useState<any[]>([]);
    const [, setData] = React.useState<any[]>([]);
    const [title, setTitle] = React.useState('');
    const [id, setId] = React.useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (salon) {
        }
    }, [salon]);

    type InfoItem = {
        id: number;
        codigo: string;
        nombreProducto: string;
        subCodigo: string;
        descripcion: string;
        tipo: string;
        unidadMedida: string;
        porcionBruta: number;
        check: boolean;
    };

    type InfoArray = InfoItem[];

    const [info, setInfo] = React.useState<InfoArray[]>([]);

    useEffect(() => {
        setLoading(true);

        fetch('/api/expedicion')
            .then((res) => res.json())
            .then((data) => {
                setData(data);
                setEvents(
                    data.map((evento: any) => ({
                        title: evento.lugar + ' - ' + evento.salon,
                        date: evento.fecha.split('T')[0],
                        id: evento.id,
                    }))
                );
                setTitle(
                    data[0].lugar +
                        ' - ' +
                        data[0].salon +
                        ' - ' +
                        format(data[0].fecha, 'EEEE dd/MM/yyyy', {
                            locale: es,
                        })
                );
                setId(data[0].id);
            });
    }, []);

    useEffect(() => {
        if (id === 0) return;

        setLoading(true);

        fetch('/api/exEvento?id=' + id)
            .then((res) => res.json())
            .then((data) => {
                setInfo(data);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [id]);

    const checkExpedicion = async (
        checked: boolean,
        codigo: string,
        subCodigo: string
    ) => {
        fetch('/api/exEvento', {
            method: checked ? 'POST' : 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                codigo,
                subCodigo,
                comandaId: id,
            }),
        });
    };

    const updateCheck = (i: number, j: number, checked: boolean) => {
        const nuevoInfo = [...info];
        nuevoInfo[i] = info[i].map((ingrediente, k) =>
            k === j ? { ...ingrediente, check: checked } : ingrediente
        );

        setInfo(nuevoInfo);
    };

    const checkAllExpedicion = async (checked: boolean, i: number) => {
        // actualizar en backend todas las filas
        await Promise.all(
            info[i].map((ingrediente) =>
                checkExpedicion(
                    checked,
                    ingrediente.codigo,
                    ingrediente.subCodigo
                )
            )
        );

        // crear nueva copia del estado
        const nuevoInfo = [...info];
        nuevoInfo[i] = info[i].map((ingrediente) => ({
            ...ingrediente,
            check: checked,
        }));

        setInfo(nuevoInfo);
    };

    const weekStart = new Date();

    if (loading) {
        return <Loading />;
    }

    return (
        <Container className="mt-5">
            <h2 className="text-center mb-4">Expedicion</h2>

            <FullCalendar
                plugins={[dayGridPlugin, bootstrap5Plugin]}
                themeSystem="bootstrap5"
                initialView="dayGridWeek"
                initialDate={weekStart}
                headerToolbar={false}
                events={events}
                eventClick={(info) => {
                    setId(Number(info.event.id));
                    setTitle(
                        info.event.title +
                            ' - ' +
                            format(
                                addDays(info.event.startStr, 1),
                                'EEEE dd/MM/yyyy',
                                {
                                    locale: es,
                                }
                            )
                    );
                }}
                locales={[esLocale]}
                locale="es"
                height="10rem"
                dayHeaderFormat={{
                    // weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                }}
            />

            <h2 className="text-center mt-5">{title}</h2>

            {info.map((data, i) => {
                if (data.length === 0) return;
                return (
                    <Accordion
                        defaultActiveKey="0"
                        className="mb-3"
                        key={i}>
                        <Accordion.Item eventKey={i.toString()}>
                            <Accordion.Header>
                                {data[0].nombreProducto}
                            </Accordion.Header>
                            <Accordion.Body>
                                <Form.Check
                                    className="ms-2 fw-bold"
                                    type="checkbox"
                                    id={`${i}`}
                                    label={`Marcar todas`}
                                    checked={data.every(
                                        (ingrediente) => ingrediente.check
                                    )}
                                    onChange={(e) => {
                                        checkAllExpedicion(e.target.checked, i);
                                    }}
                                />
                                <Table>
                                    <thead>
                                        <tr>
                                            <th></th>
                                            <th>Codigo</th>
                                            <th>Producto</th>
                                            <th>Sub Codigo</th>
                                            <th>Sub Producto</th>
                                            <th>Tipo</th>
                                            <th>Unidad Medida</th>
                                            <th>Porcion Bruta</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((item, j) => {
                                            return (
                                                <tr key={i + ' ' + j}>
                                                    <td>
                                                        <Form.Check
                                                            type="checkbox"
                                                            id={`${item.codigo}${item.subCodigo}`}
                                                            label={``}
                                                            checked={item.check}
                                                            onChange={(e) => {
                                                                checkExpedicion(
                                                                    e.target
                                                                        .checked,
                                                                    item.codigo,
                                                                    item.subCodigo
                                                                );
                                                                updateCheck(
                                                                    i,
                                                                    j,
                                                                    e.target
                                                                        .checked
                                                                );
                                                            }}
                                                        />
                                                    </td>
                                                    <td>{item.codigo}</td>
                                                    <td>
                                                        {item.nombreProducto}
                                                    </td>
                                                    <td>{item.subCodigo}</td>
                                                    <td>{item.descripcion}</td>
                                                    <td>{item.tipo}</td>
                                                    <td>{item.unidadMedida}</td>
                                                    <td>{item.porcionBruta}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </Table>
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                );
                // <tr key={i}>
                //     <td>{data.codigo}</td>
                //     <td>{data.nombreProducto}</td>
                //     <td>{data.subCodigo}</td>
                //     <td>{data.descripcion}</td>
                //     <td>{data.tipo}</td>
                //     <td>{data.unidadMedida}</td>
                //     <td>{data.porcionBruta.toFixed(2)}</td>
                //     <td>
                //         <InputGroup.Checkbox aria-label="Checkbox for following text input" />
                //     </td>
                // </tr>
            })}
        </Container>
    );
}
