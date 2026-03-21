'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchPlanificacion } from '@/modules/planificacion/services/planificacion.client';
import type {
    PlanificacionIngrediente,
    ProduccionPlanificacion,
    SalonPlanificacion,
} from '@/modules/planificacion/types';

export function usePlanificacionData({
    comandasRefreshToken,
    fechaInicioConsulta,
    planificacionRefreshToken,
    salonActual,
}: {
    comandasRefreshToken: number;
    fechaInicioConsulta: string;
    planificacionRefreshToken: number;
    salonActual: SalonPlanificacion;
}) {
    const [datosPlanificacion, setDatosPlanificacion] = useState<
        PlanificacionIngrediente[]
    >([]);
    const [produccion, setProduccion] = useState<ProduccionPlanificacion[]>([]);
    const [loading, setLoading] = useState(false);
    const [actualizandoPlanificacion, setActualizandoPlanificacion] =
        useState(false);
    const primeraCargaPlanificacionRef = useRef(true);

    useEffect(() => {
        const primeraCarga = primeraCargaPlanificacionRef.current;
        const abortController = new AbortController();

        if (primeraCarga) {
            setLoading(true);
        } else {
            setActualizandoPlanificacion(true);
        }

        void fetchPlanificacion({
            fechaInicio: fechaInicioConsulta,
            salon: salonActual,
            signal: abortController.signal,
        })
            .then((data) => {
                setDatosPlanificacion(data.planificacion);
                setProduccion(data.produccion);
            })
            .catch((error) => {
                if (error?.name === 'AbortError') {
                    return;
                }
            })
            .finally(() => {
                if (abortController.signal.aborted) {
                    return;
                }

                if (primeraCarga) {
                    setLoading(false);
                    primeraCargaPlanificacionRef.current = false;
                    return;
                }

                setActualizandoPlanificacion(false);
            });

        return () => {
            abortController.abort();
        };
    }, [
        comandasRefreshToken,
        fechaInicioConsulta,
        planificacionRefreshToken,
        salonActual,
    ]);

    return {
        actualizandoPlanificacion,
        datosPlanificacion,
        loading,
        produccion,
        setProduccion,
    };
}
