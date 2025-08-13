'use client';

import { Col, Container, Form, Row } from 'react-bootstrap';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import esLocale from '@fullcalendar/core/locales/es';
import '@fullcalendar/bootstrap5';
import { useEffect, useState } from 'react';
import { startOfWeek, addWeeks } from 'date-fns';
import { useRouter } from 'next/navigation';
import { MoonLoader } from 'react-spinners';
// import timeGridPlugin from '@fullcalendar/timegrid';
// import interactionPlugin from '@fullcalendar/interaction';
// import '@fullcalendar/core/index.css';
// import '@fullcalendar/daygrid/index.css';

export default function CalendarioPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filtroSalon, setFiltroSalon] = useState<string | null>('');
    const router = useRouter();

    useEffect(() => {
        setLoading(true);
        fetch('/api/calendario?salon=' + filtroSalon)
            .then((response) => response.json())
            .then((data) => {
                setEvents(data);
            })
            .catch((error) => {
                console.error('Error fetching events:', error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [filtroSalon]);

    const baseDate = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weeks = [0, 1, 2, 3].map((offset) => addWeeks(baseDate, offset));

    if (loading) {
        return (
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
                    size={100}
                    speedMultiplier={0.5}
                />
            </div>
        );
    }

    return (
        <Container className="py-4">
            <h3 className="mb-3">Calendario de eventos</h3>

            <Container className="mb-3">
                <Row>
                    <Col xs={4}>
                        <Form.Group>
                            <Form.Label>Filtrar por salón</Form.Label>
                            <Form.Select
                                value={filtroSalon || ''}
                                onChange={(e) =>
                                    setFiltroSalon(e.target.value)
                                }>
                                <option value="">Todos</option>
                                <option value="A">Rut Haus - Origami</option>
                                <option value="B">El Central - La Rural</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
            </Container>

            <div>
                <div
                    style={{
                        display: 'flex',
                        textAlign: 'center',
                        fontWeight: 'bold',
                    }}>
                    {[
                        'Lunes',
                        'Martes',
                        'Miércoles',
                        'Jueves',
                        'Viernes',
                        'Sábado',
                        'Domingo',
                    ].map((dia, i) => (
                        <div
                            key={i}
                            style={{ flex: 1 }}>
                            {dia}
                        </div>
                    ))}
                </div>

                {weeks.map((weekStart, i) => (
                    <div key={i}>
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
                    </div>
                ))}
            </div>

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
        </Container>
    );
}
