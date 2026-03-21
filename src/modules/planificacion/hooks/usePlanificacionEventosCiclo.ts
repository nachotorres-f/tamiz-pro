'use client';

import { addDays, format } from 'date-fns';
import { useEffect, useState } from 'react';
import { fetchEventosPlanificacion } from '@/modules/planificacion/services/planificacion.client';
import type {
    EventoPlanificacion,
    SalonPlanificacion,
} from '@/modules/planificacion/types';

function eventoDentroDeCiclo(
    evento: EventoPlanificacion,
    inicioCiclo: Date,
    finCiclo: Date,
) {
    const fechaEvento = new Date(evento.fecha);
    fechaEvento.setHours(0, 0, 0, 0);

    return (
        fechaEvento.getTime() >= inicioCiclo.getTime() &&
        fechaEvento.getTime() <= finCiclo.getTime()
    );
}

function maxEventosPorDia(items: EventoPlanificacion[]) {
    const contador = new Map<number, number>();

    for (const item of items) {
        const fechaEvento = new Date(item.fecha);
        fechaEvento.setHours(0, 0, 0, 0);
        const key = fechaEvento.getTime();
        contador.set(key, (contador.get(key) || 0) + 1);
    }

    if (contador.size === 0) {
        return 0;
    }

    return Math.max(...Array.from(contador.values()));
}

export function usePlanificacionEventosCiclo({
    comandasRefreshToken,
    diasSemana,
    salonActual,
}: {
    comandasRefreshToken: number;
    diasSemana: Date[];
    salonActual: SalonPlanificacion;
}) {
    const [eventos, setEventos] = useState<EventoPlanificacion[]>([]);
    const [comandasCiclo, setComandasCiclo] = useState<EventoPlanificacion[]>(
        [],
    );
    const [maxCantidadEventosDia, setMaxCantidadEventosDia] = useState(0);

    useEffect(() => {
        if (diasSemana.length < 5) {
            return;
        }

        const inicioCiclo = new Date(diasSemana[4]);
        inicioCiclo.setHours(0, 0, 0, 0);

        const finCiclo = addDays(inicioCiclo, 6);
        finCiclo.setHours(0, 0, 0, 0);

        const fechaFinal = format(addDays(diasSemana[4], 6), 'yyyy-MM-dd');
        const fechaInicio = format(diasSemana[4], 'yyyy-MM-dd');

        Promise.all([
            fetchEventosPlanificacion({
                fechaInicio,
                fechaFinal,
                salon: salonActual,
                incluirDeshabilitadas: true,
            }),
            fetchEventosPlanificacion({
                fechaInicio,
                fechaFinal,
                salon: salonActual,
            }),
        ])
            .then(([todos, filtrados]) => {
                const eventosCicloTodos = todos.eventos.filter((evento) =>
                    eventoDentroDeCiclo(evento, inicioCiclo, finCiclo),
                );
                const eventosCicloHabilitados = filtrados.eventos.filter(
                    (evento) => eventoDentroDeCiclo(evento, inicioCiclo, finCiclo),
                );

                setComandasCiclo(eventosCicloTodos);
                setEventos(eventosCicloHabilitados);
                setMaxCantidadEventosDia(
                    maxEventosPorDia(eventosCicloHabilitados),
                );
            })
            .catch(() => {
                setComandasCiclo([]);
                setEventos([]);
                setMaxCantidadEventosDia(0);
            });
    }, [comandasRefreshToken, diasSemana, salonActual]);

    return {
        comandasCiclo,
        eventos,
        maxCantidadEventosDia,
    };
}
