import { format } from 'date-fns';
import React, { useEffect } from 'react';
// import { ListGroup } from 'react-bootstrap';

interface EventoPlanificacion {
    fecha: string;
    lugar: string;
    nombre: string;
    salon: string;
    // agrega aquí otras propiedades si existen
}

export default function TablaEventosPlanificacion({
    diasSemana,
    diaActivo,
    filtroSalon,
}: // anchoColumna,
{
    diasSemana: Date[];
    diaActivo: string;
    filtroSalon: string | null;
    // anchoColumna?: number;
}) {
    const [eventos, setEventos] = React.useState<EventoPlanificacion[]>([]);
    const [eventosFiltrados, setEventosFiltrados] = React.useState<
        EventoPlanificacion[]
    >([]);

    useEffect(() => {
        const fechaInicio = diasSemana[5] ?? null;
        const fechaFinal = diasSemana[diasSemana.length - 2] ?? null;

        if (!fechaInicio || !fechaFinal) {
            setEventos([]);
            return;
        }

        fetch(
            '/api/eventosPlanificacion?fechaInicio=' +
                format(fechaInicio, 'yyyy-MM-dd') +
                '&fechaFinal=' +
                format(fechaFinal, 'yyyy-MM-dd')
        )
            .then((res) => res.json())
            .then((data) => setEventos(data));
    }, [diasSemana]);

    useEffect(() => {
        if (filtroSalon) {
            const eventosFiltrados = eventos.filter((d) => {
                if (filtroSalon === 'A') {
                    return !['el central', 'la rural'].includes(
                        d.lugar.toLowerCase()
                    );
                }

                if (filtroSalon === 'B') {
                    return ['el central', 'la rural'].includes(
                        d.lugar.toLowerCase()
                    );
                }
            });
            setEventosFiltrados(eventosFiltrados);
        } else {
            // Si no hay filtro, mostramos todos los eventos
            setEventosFiltrados(eventos);
        }
    }, [filtroSalon, eventos]);

    const filterDias = (dia: Date) => {
        if (diaActivo && format(dia, 'yyyy-MM-dd') !== diaActivo) {
            return false;
        }
        return true;
    };

    return (
        <ul style={{ fontSize: '0.8rem', maxWidth: 'max-content' }}>
            {diasSemana && diasSemana.length > 0 && (
                <li
                    className="mb-2"
                    style={{
                        textAlign: 'center',
                        listStyle: 'none',
                        borderBottom: '.05rem solid',
                    }}>
                    <strong>
                        {diasSemana[4].toISOString().split('T')[0]} -{' '}
                        {
                            diasSemana[diasSemana.length - 3]
                                .toISOString()
                                .split('T')[0]
                        }
                    </strong>
                </li>
            )}
            {eventosFiltrados.map((evento, idx) =>
                diasSemana.filter(filterDias).map((dia, diaIdx) => {
                    const fechaEvento = format(
                        new Date(evento.fecha),
                        'yyyy-MM-dd'
                    );
                    const fechaDia = format(dia, 'yyyy-MM-dd');

                    if (fechaEvento !== fechaDia) return null;

                    return (
                        <li key={idx + diaIdx}>
                            {format(
                                new Date(evento.fecha.split('T')[0]),
                                'dd-MM-yyyy'
                            )}
                            {' - '}
                            <strong>{evento.nombre}</strong>
                            {' - '}
                            {evento.lugar}
                            {' - '}
                            {evento.salon}
                        </li>
                    );
                })
            )}
        </ul>
        // <Table
        //     size="sm"
        //     bordered
        //     striped>
        //     <thead className="table-dark">
        //         <tr style={{ textAlign: 'center' }}>
        //             {/* <th style={{ width: anchoColumna + 'px' }}></th> */}
        //             {diasSemana.filter(filterDias).map((dia, idx) => (
        //                 <th key={idx}>
        //                     {format(dia, 'EEEE d MMMM', { locale: es })}
        //                 </th>
        //             ))}
        //         </tr>
        //     </thead>
        //     <tbody>
        //     </tbody>
        // </Table>
    );
}
