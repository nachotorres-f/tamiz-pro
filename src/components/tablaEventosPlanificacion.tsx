import { format } from 'date-fns';
import React, { useEffect } from 'react';
import { Table } from 'react-bootstrap';
import { es } from 'date-fns/locale';

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
        const fechaInicio = diasSemana[0] ?? null;
        const fechaFinal = diasSemana[diasSemana.length - 1] ?? null;

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
                    return filtroSalon === 'A'
                        ? d.lugar.toLowerCase() !== 'el central'
                        : d.lugar.toLowerCase() !== 'la rural';
                }

                if (filtroSalon === 'B') {
                    return filtroSalon === 'B'
                        ? d.lugar.toLowerCase() === 'el central'
                        : d.lugar.toLowerCase() === 'la rural';
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
        <Table
            size="sm"
            bordered
            striped>
            <thead className="table-dark">
                <tr style={{ textAlign: 'center' }}>
                    {/* <th style={{ width: anchoColumna + 'px' }}></th> */}
                    {diasSemana.filter(filterDias).map((dia, idx) => (
                        <th key={idx}>
                            {format(dia, 'EEEE d MMMM', { locale: es })}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {eventosFiltrados.map((evento, idx) => (
                    <tr key={idx}>
                        {diasSemana.filter(filterDias).map((dia, diaIdx) => {
                            const fechaEvento = format(
                                new Date(evento.fecha),
                                'yyyy-MM-dd'
                            );
                            const fechaDia = format(dia, 'yyyy-MM-dd');

                            return (
                                <td key={diaIdx}>
                                    {fechaEvento === fechaDia ? (
                                        <div>
                                            <strong>{evento.nombre}</strong>
                                            <br />
                                            {evento.lugar} - {evento.salon}
                                        </div>
                                    ) : (
                                        ''
                                    )}
                                </td>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </Table>
    );
}
