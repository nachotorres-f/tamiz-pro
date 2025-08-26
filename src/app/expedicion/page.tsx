/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Accordion, Container } from 'react-bootstrap';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import esLocale from '@fullcalendar/core/locales/es';
import { ChecklistEvento } from '@/components/ChecklistEvento';

export default function PlanificacionPage() {
    const router = useRouter();
    const [events, setEvents] = React.useState<any[]>([]);
    const [data, setData] = React.useState<any[]>([]);

    useEffect(() => {
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
            });
    }, []);

    const weekStart = new Date();

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
                    router.push('/evento/' + info.event.id);
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

            {data.map((evento) => {
                return (
                    <Accordion
                        key={evento.id}
                        className="my-3">
                        <Accordion.Item eventKey={evento.id}>
                            <Accordion.Header>
                                {evento.lugar} - {evento.salon} -{' '}
                                {evento.nombre}
                            </Accordion.Header>
                            <Accordion.Body>
                                <ChecklistEvento idEvent={evento.id} />
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                );
            })}
        </Container>
    );
}
