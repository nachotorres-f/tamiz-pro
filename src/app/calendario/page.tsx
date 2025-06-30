'use client';

import { Container } from 'react-bootstrap';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import esLocale from '@fullcalendar/core/locales/es';
import '@fullcalendar/bootstrap5';
import { useEffect, useState } from 'react';
// import '@fullcalendar/core/index.css';
// import '@fullcalendar/daygrid/index.css';

export default function CalendarioPage() {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        fetch('/api/calendario')
            .then((response) => response.json())
            .then((data) => {
                setEvents(data);
            })
            .catch((error) => {
                console.error('Error fetching events:', error);
            });
    });

    return (
        <Container className="py-4">
            <h3 className="mb-3">Calendario de eventos</h3>

            <FullCalendar
                plugins={[dayGridPlugin, bootstrap5Plugin]}
                themeSystem="bootstrap5"
                initialView="dayGridMonth"
                events={events}
                locales={[esLocale]}
                locale="es"
                buttonText={{
                    prev: 'Anterior',
                    next: 'Siguiente',
                }}
                dayHeaderFormat={{
                    weekday: 'long',
                }}
            />
        </Container>
    );
}
