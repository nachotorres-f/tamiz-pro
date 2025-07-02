'use client';

import { Container } from 'react-bootstrap';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import esLocale from '@fullcalendar/core/locales/es';
import '@fullcalendar/bootstrap5';
import { useEffect, useState } from 'react';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
// import '@fullcalendar/core/index.css';
// import '@fullcalendar/daygrid/index.css';

export default function CalendarioPage() {
    const [events, setEvents] = useState([]);
    const router = useRouter();

    useEffect(() => {
        const hoy = new Date();

        const lunes = startOfWeek(hoy, { weekStartsOn: 1 }); // lunes
        const domingo = endOfWeek(hoy, { weekStartsOn: 2 }); // domingo

        fetch('/api/calendario')
            .then((response) => response.json())
            .then((data) => {
                data.push({
                    title: 'Semana actual',
                    start: lunes
                        ? format(lunes, 'yyyy-MM-dd', { locale: es })
                        : '',
                    end: domingo
                        ? format(domingo, 'yyyy-MM-dd', { locale: es })
                        : '',
                    display: 'background',
                    color: '#fff3cd',
                });
                setEvents(data);
            })
            .catch((error) => {
                console.error('Error fetching events:', error);
            });
    }, []);

    return (
        <Container className="py-4">
            <h3 className="mb-3">Calendario de eventos</h3>

            <FullCalendar
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
            />
        </Container>
    );
}
