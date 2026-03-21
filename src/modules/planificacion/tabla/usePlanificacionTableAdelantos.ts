'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    actualizarPlatoAdelantado,
    fetchPlatosAdelantados,
} from '@/modules/planificacion/services/planificacion.client';
import type { PlatoAdelantado } from '@/modules/planificacion/types';

export function usePlanificacionTableAdelantos({
    canEdit,
    onPlanificacionChanged,
}: {
    canEdit: boolean;
    onPlanificacionChanged: () => void;
}) {
    const [adelantarEvento, setAdelantarEvento] = useState(0);
    const [platosAdelantados, setPlatosAdelantados] = useState<
        PlatoAdelantado[]
    >([]);
    const [cargandoPlatosAdelantados, setCargandoPlatosAdelantados] =
        useState(false);
    const [adelantandoTodo, setAdelantandoTodo] = useState(false);
    const [accionMasivaAdelanto, setAccionMasivaAdelanto] = useState<
        'adelantar' | 'desadelantar' | null
    >(null);
    const [platosGuardandoAdelanto, setPlatosGuardandoAdelanto] = useState<
        Set<number>
    >(new Set());
    const [cerrandoModalAdelanto, setCerrandoModalAdelanto] = useState(false);

    const solicitudesAdelantoPendientesRef = useRef<Promise<boolean>[]>([]);
    const timerRefrescoPlanificacionRef = useRef<number | null>(null);
    const cachePlatosAdelantadosRef = useRef<Map<number, PlatoAdelantado[]>>(
        new Map(),
    );

    const dispararActualizacionPlanificacion = useCallback(
        (inmediato = false) => {
            if (timerRefrescoPlanificacionRef.current !== null) {
                window.clearTimeout(timerRefrescoPlanificacionRef.current);
                timerRefrescoPlanificacionRef.current = null;
            }

            if (inmediato) {
                onPlanificacionChanged();
                return;
            }

            timerRefrescoPlanificacionRef.current = window.setTimeout(() => {
                onPlanificacionChanged();
                timerRefrescoPlanificacionRef.current = null;
            }, 300);
        },
        [onPlanificacionChanged],
    );

    useEffect(
        () => () => {
            if (timerRefrescoPlanificacionRef.current !== null) {
                window.clearTimeout(timerRefrescoPlanificacionRef.current);
            }
        },
        [],
    );

    const abrirAdelantoEvento = useCallback(
        (eventoId: number) => {
            if (!canEdit) {
                return;
            }

            const cached =
                cachePlatosAdelantadosRef.current.get(eventoId) ?? null;

            setAdelantarEvento(eventoId);
            setPlatosAdelantados(cached ?? []);
            setCargandoPlatosAdelantados(cached === null);
        },
        [canEdit],
    );

    useEffect(() => {
        if (adelantarEvento === 0) {
            return;
        }

        const cached =
            cachePlatosAdelantadosRef.current.get(adelantarEvento) ?? null;

        if (cached !== null) {
            setPlatosAdelantados(cached);
            setCargandoPlatosAdelantados(false);
            return;
        }

        const abortController = new AbortController();
        setCargandoPlatosAdelantados(true);

        void fetchPlatosAdelantados(adelantarEvento, abortController.signal)
            .then((platos) => {
                cachePlatosAdelantadosRef.current.set(adelantarEvento, platos);
                setPlatosAdelantados(platos);
            })
            .catch((error) => {
                if (error?.name === 'AbortError') {
                    return;
                }

                console.error('Error al adelantar el evento:', error);
                setPlatosAdelantados([]);
            })
            .finally(() => {
                if (abortController.signal.aborted) {
                    return;
                }

                setCargandoPlatosAdelantados(false);
            });

        return () => {
            abortController.abort();
        };
    }, [adelantarEvento]);

    useEffect(() => {
        if (adelantarEvento === 0 || cargandoPlatosAdelantados) {
            return;
        }

        cachePlatosAdelantadosRef.current.set(
            adelantarEvento,
            platosAdelantados,
        );
    }, [adelantarEvento, cargandoPlatosAdelantados, platosAdelantados]);

    const registrarSolicitudAdelanto = useCallback(
        (solicitud: Promise<boolean>) => {
            solicitudesAdelantoPendientesRef.current.push(solicitud);
            void solicitud.finally(() => {
                solicitudesAdelantoPendientesRef.current =
                    solicitudesAdelantoPendientesRef.current.filter(
                        (pendiente) => pendiente !== solicitud,
                    );
            });
        },
        [],
    );

    const actualizarAdelantoPlato = useCallback(
        async (
            platoId: number,
            adelantar: boolean,
            fechaAnterior: string | null,
        ) => {
            setPlatosAdelantados((prev) =>
                prev.map((item) =>
                    item.id === platoId
                        ? {
                              ...item,
                              fecha: adelantar ? new Date().toISOString() : null,
                          }
                        : item,
                ),
            );
            setPlatosGuardandoAdelanto((prev) => {
                const next = new Set(prev);
                next.add(platoId);
                return next;
            });

            try {
                await actualizarPlatoAdelantado({
                    adelantar,
                    id: platoId,
                });
                return true;
            } catch (error) {
                console.error('Error al actualizar adelanto de plato:', error);
                setPlatosAdelantados((prev) =>
                    prev.map((item) =>
                        item.id === platoId
                            ? { ...item, fecha: fechaAnterior }
                            : item,
                    ),
                );
                return false;
            } finally {
                setPlatosGuardandoAdelanto((prev) => {
                    const next = new Set(prev);
                    next.delete(platoId);
                    return next;
                });
            }
        },
        [],
    );

    const handleToggleAdelantoTodo = useCallback(async () => {
        if (adelantandoTodo || cargandoPlatosAdelantados) {
            return;
        }

        const todosAdelantadosActual =
            platosAdelantados.length > 0 &&
            platosAdelantados.every((plato) => !!plato.fecha);
        const adelantar = !todosAdelantadosActual;
        const accion: 'adelantar' | 'desadelantar' = adelantar
            ? 'adelantar'
            : 'desadelantar';
        const platosAActualizar = platosAdelantados.filter((plato) =>
            adelantar ? !plato.fecha : !!plato.fecha,
        );

        if (platosAActualizar.length === 0) {
            return;
        }

        setAdelantandoTodo(true);
        setAccionMasivaAdelanto(accion);

        try {
            const solicitudes = platosAActualizar.map((plato) => {
                const solicitud = actualizarAdelantoPlato(
                    plato.id,
                    adelantar,
                    plato.fecha,
                );
                registrarSolicitudAdelanto(solicitud);
                return solicitud;
            });

            const resultados = await Promise.all(solicitudes);
            if (resultados.some(Boolean)) {
                dispararActualizacionPlanificacion(true);
            }
        } finally {
            setAdelantandoTodo(false);
            setAccionMasivaAdelanto(null);
        }
    }, [
        actualizarAdelantoPlato,
        adelantandoTodo,
        cargandoPlatosAdelantados,
        dispararActualizacionPlanificacion,
        platosAdelantados,
        registrarSolicitudAdelanto,
    ]);

    const handleCloseAdelantar = useCallback(async () => {
        if (cerrandoModalAdelanto) {
            return;
        }

        setCerrandoModalAdelanto(true);

        try {
            const pendientes = [...solicitudesAdelantoPendientesRef.current];
            if (pendientes.length > 0) {
                await Promise.allSettled(pendientes);
            }

            setAdelantarEvento(0);
            setPlatosAdelantados([]);
            setCargandoPlatosAdelantados(false);
            setAdelantandoTodo(false);
            setAccionMasivaAdelanto(null);
        } finally {
            setCerrandoModalAdelanto(false);
        }
    }, [cerrandoModalAdelanto]);

    const handleTogglePlatoAdelantado = useCallback(
        (platoId: number, adelantar: boolean, fechaAnterior: string | null) => {
            const solicitud = actualizarAdelantoPlato(
                platoId,
                adelantar,
                fechaAnterior,
            );

            registrarSolicitudAdelanto(solicitud);
            void solicitud.then((actualizado) => {
                if (actualizado) {
                    dispararActualizacionPlanificacion();
                }
            });
        },
        [
            actualizarAdelantoPlato,
            dispararActualizacionPlanificacion,
            registrarSolicitudAdelanto,
        ],
    );

    const todosAdelantados = useMemo(
        () =>
            platosAdelantados.length > 0 &&
            platosAdelantados.every((plato) => !!plato.fecha),
        [platosAdelantados],
    );

    return {
        abrirAdelantoEvento,
        accionMasivaAdelanto,
        adelantarEvento,
        adelantandoTodo,
        cargandoPlatosAdelantados,
        cerrandoModalAdelanto,
        handleCloseAdelantar,
        handleToggleAdelantoTodo,
        handleTogglePlatoAdelantado,
        platosAdelantados,
        platosGuardandoAdelanto,
        todosAdelantados,
    };
}
