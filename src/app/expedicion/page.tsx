/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { useEffect } from 'react';

import { Container, InputGroup, Table } from 'react-bootstrap';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import esLocale from '@fullcalendar/core/locales/es';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MoonLoader } from 'react-spinners';

export default function PlanificacionPage() {
    const [events, setEvents] = React.useState<any[]>([]);
    const [, setData] = React.useState<any[]>([]);
    const [title, setTitle] = React.useState('');
    const [id, setId] = React.useState(0);
    const [loading, setLoading] = useState(false);

    type InfoItem = {
        id: number;
        codigo: string;
        nombreProducto: string;
        subCodigo: string;
        descripcion: string;
        tipo: string;
        unidadMedida: string;
        porcionBruta: number;
    };

    const [info, setInfo] = React.useState<InfoItem[]>([]);

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
                        format(addDays(data[0].fecha, 1), 'EEEE dd/MM/yyyy', {
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

    const weekStart = new Date();

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

            <Table>
                <thead>
                    <tr>
                        <th>Codigo</th>
                        <th>Nombre</th>
                        <th>Codigo</th>
                        <th>Ingrediente</th>
                        <th>Tipo</th>
                        <th>Unidad de Medida</th>
                        <th>Cantidad</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {info.map((data, i) => {
                        return (
                            <tr key={i}>
                                <td>{data.codigo}</td>
                                <td>{data.nombreProducto}</td>
                                <td>{data.subCodigo}</td>
                                <td>{data.descripcion}</td>
                                <td>{data.tipo}</td>
                                <td>{data.unidadMedida}</td>
                                <td>{data.porcionBruta.toFixed(2)}</td>
                                <td>
                                    <InputGroup.Checkbox aria-label="Checkbox for following text input" />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </Container>
    );
}
