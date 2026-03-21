'use client';

import { addDays, format, startOfWeek } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import type {
    ObservacionPlanificacion,
    PlanificacionFilaBase,
    SalonPlanificacion,
} from '@/modules/planificacion/types';
import { usePlanificacionAutoSave } from '@/modules/planificacion/hooks/usePlanificacionAutoSave';
import { usePlanificacionData } from '@/modules/planificacion/hooks/usePlanificacionData';
import { usePlanificacionEventosCiclo } from '@/modules/planificacion/hooks/usePlanificacionEventosCiclo';

export function usePlanificacionPageState({
    salonActual,
}: {
    salonActual: SalonPlanificacion;
}) {
    const [semanaBase] = useState(() => new Date());
    const [comandasRefreshToken, setComandasRefreshToken] = useState(0);
    const [planificacionRefreshToken, setPlanificacionRefreshToken] =
        useState(0);
    const [observaciones, setObservaciones] = useState<
        ObservacionPlanificacion[]
    >([]);

    const fechaInicioConsulta = useMemo(
        () =>
            startOfWeek(addDays(semanaBase, 4), {
                weekStartsOn: 1,
            }).toISOString(),
        [semanaBase],
    );

    const fechaInicioPlanificacion = useMemo(
        () => fechaInicioConsulta.split('T')[0],
        [fechaInicioConsulta],
    );

    const diasSemana = useMemo(() => {
        const inicioSemana = startOfWeek(semanaBase, { weekStartsOn: 4 });

        return Array.from({ length: 60 }, (_, index) =>
            addDays(inicioSemana, index),
        );
    }, [semanaBase]);

    const diaActivo = '';

    const refreshPlanificacion = useCallback(() => {
        setPlanificacionRefreshToken((prev) => prev + 1);
    }, []);

    const refreshComandas = useCallback(() => {
        setComandasRefreshToken((prev) => prev + 1);
    }, []);

    const {
        actualizandoPlanificacion,
        datosPlanificacion,
        loading,
        produccion,
        setProduccion,
    } = usePlanificacionData({
        comandasRefreshToken,
        fechaInicioConsulta,
        planificacionRefreshToken,
        salonActual,
    });

    const { comandasCiclo, eventos, maxCantidadEventosDia } =
        usePlanificacionEventosCiclo({
            comandasRefreshToken,
            diasSemana,
            salonActual,
        });

    const {
        estadoAutoGuardado,
        produccionUpdate,
        setProduccionUpdate,
        ultimaSincronizacion,
    } = usePlanificacionAutoSave({
        fechaInicioPlanificacion,
        salonActual,
        setProduccion,
    });

    const platosUnicos = useMemo<PlanificacionFilaBase[]>(
        () =>
            Array.from(
                new Map(
                    datosPlanificacion.map((item) => [
                        `${item.platoCodigo}-${item.platoPadreCodigo}`,
                        {
                            plato: item.plato,
                            platoCodigo: item.platoCodigo,
                            platoPadre: item.platoPadre,
                            platoPadreCodigo: item.platoPadreCodigo,
                        },
                    ]),
                ).values(),
            ),
        [datosPlanificacion],
    );

    const inicioSemana = useMemo(
        () => startOfWeek(semanaBase, { weekStartsOn: 1 }),
        [semanaBase],
    );
    const finSemana = useMemo(
        () => addDays(inicioSemana, 6),
        [inicioSemana],
    );
    const textoSemana = useMemo(
        () =>
            `Semana: ${format(inicioSemana, 'dd/MM/yyyy')} al ${format(
                finSemana,
                'dd/MM/yyyy',
            )}`,
        [finSemana, inicioSemana],
    );

    return {
        actualizandoPlanificacion,
        comandasCiclo,
        datosPlanificacion,
        diaActivo,
        diasSemana,
        estadoAutoGuardado,
        eventos,
        loading,
        maxCantidadEventosDia,
        observaciones,
        platosUnicos,
        produccion,
        produccionUpdate,
        refreshComandas,
        refreshPlanificacion,
        setObservaciones,
        setProduccionUpdate,
        textoSemana,
        ultimaSincronizacion,
    };
}
