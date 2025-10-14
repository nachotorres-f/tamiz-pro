'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import esLocale from '@fullcalendar/core/locales/es';
import '@fullcalendar/bootstrap5';
import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SalonContext } from '@/components/filtroPlatos';
import { Loading } from '@/components/loading';
// import timeGridPlugin from '@fullcalendar/timegrid';
// import interactionPlugin from '@fullcalendar/interaction';
// import '@fullcalendar/core/index.css';
// import '@fullcalendar/daygrid/index.css';

export default function CalendarioPage() {
    const salon = useContext(SalonContext);

    const [events, setEvents] = useState([]);
    const [weeks, setWeeks] = useState<
        { semana: Date; totalInvitados: number }[]
    >([]);
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    useEffect(() => {
        setLoading(true);
        fetch('/api/calendario?salon=' + salon)
            .then((response) => response.json())
            .then((data) => {
                setEvents(data.eventos);
                setWeeks(data.weeks);
            })
            .catch((error) => {
                console.error('Error fetching events:', error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [salon]);

    if (loading) {
        return <Loading />;
    }

    return (
        <>
            <h3 className="my-5 text-center">Calendario de eventos</h3>
            {/* <Container className="mb-3">
                <Row>
                    <Col xs={4}>
                        <Form.Group>
                            <Form.Label>Filtrar por salón</Form.Label>
                            <Form.Select
                                value={filtroSalon || ''}
                                onChange={(e) => {
                                    setFiltroSalon(e.target.value);
                                    if (!e.target.value) {
                                        sessionStorage.removeItem(
                                            'filtroSalon'
                                        );
                                    }
                                }}>
                                <option value="">Todos</option>
                                <option value="A">Rut Haus - Origami</option>
                                <option value="B">El Central - La Rural</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
            </Container> */}

            {/*             
            <p
                className="mx-auto p-3 text-center bg-warning-subtle"
                style={{ width: 'max-content' }}>
                <span className="fw-bold">Pax Mensual:</span>{' '}
                {weeks.reduce(
                    (acc, { totalInvitados }) => acc + totalInvitados,
                    0
                )}
            </p>
            */}

            {weeks.map(({ semana }, i) => (
                <div
                    key={i}
                    className="d-flex flex-row justify-content-center">
                    <div
                        className="ms-5"
                        style={{ minWidth: '80%' }}>
                        <FullCalendar
                            plugins={[dayGridPlugin, bootstrap5Plugin]}
                            themeSystem="bootstrap5"
                            initialView="dayGridWeek"
                            initialDate={semana}
                            headerToolbar={false}
                            events={events}
                            eventClick={(info) => {
                                router.push('/evento/' + info.event.id);
                            }}
                            locales={[esLocale]}
                            locale="es"
                            height="10rem"
                            dayHeaderFormat={{
                                weekday: 'long',
                                day: '2-digit',
                                month: 'long',
                            }}
                            eventContent={(arg) => {
                                const title = arg.event.title;
                                const cantidad =
                                    arg.event.extendedProps.cantidad;

                                return {
                                    html: `
                                        <p style="margin: 0; padding: 0">${title}</p>
                                        <p style="margin: 0; padding: 0">Pax: ${cantidad}</p>
                                    `,
                                };
                            }}
                        />
                    </div>
                    {/* 
                    <p
                        className="ms-5 bg-warning-subtle p-3 text-center align-items-start"
                        style={{ minWidth: '10%', maxHeight: 'min-content' }}>
                        <span className="fw-bold">Pax semanal: </span>
                        {totalInvitados}
                    </p>
 */}
                </div>
            ))}
            {/* <FullCalendar
                plugins={[dayGridPlugin, bootstrap5Plugin]}
                themeSystem="bootstrap5"
                initialView="dayGridMonth"
                events={events}
                eventClick={(info) => {
                    router.push('/evento/' + info.event.id);
                }}
                locales={[esLocale]}
                locale="es"
                buttonText={{
                    prev: 'Anterior',
                    next: 'Siguiente',
                }}
                dayHeaderFormat={{
                    weekday: 'long',
                }}
            /> */}
        </>
    );
}
