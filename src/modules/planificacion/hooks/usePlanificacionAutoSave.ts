'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
    PLANIFICACION_AUTO_SAVE_DELAY_MS,
    PLANIFICACION_AUTO_SAVE_LEGACY_STORAGE_KEY,
    getPlanificacionAutoSaveStorageKey,
} from '@/modules/planificacion/constants';
import { guardarPlanificacion } from '@/modules/planificacion/services/planificacion.client';
import type {
    EstadoAutoGuardado,
    ProduccionChange,
    ProduccionPlanificacion,
    SalonPlanificacion,
} from '@/modules/planificacion/types';
import {
    construirClaveProduccion,
    construirFirmaProduccion,
    esCambioEliminacion,
    mergeProduccionGuardada,
    sanitizarProduccionUpdate,
} from '@/modules/planificacion/utils/produccion';

type ProduccionUpdatePorSalon = Record<SalonPlanificacion, ProduccionChange[]>;

function crearEstadoInicialPorSalon(): ProduccionUpdatePorSalon {
    return {
        A: [],
        B: [],
    };
}

function leerProduccionUpdateStorage(storageKey: string): ProduccionChange[] {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const raw = window.localStorage.getItem(storageKey);

        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw) as unknown;

        return Array.isArray(parsed) ? (parsed as ProduccionChange[]) : [];
    } catch {
        return [];
    }
}

function escribirProduccionUpdateStorage(
    storageKey: string,
    value: ProduccionChange[],
) {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
}

export function usePlanificacionAutoSave({
    fechaInicioPlanificacion,
    salonActual,
    setProduccion,
}: {
    fechaInicioPlanificacion: string;
    salonActual: SalonPlanificacion;
    setProduccion: Dispatch<SetStateAction<ProduccionPlanificacion[]>>;
}) {
    const [produccionUpdatePorSalon, setProduccionUpdatePorSalon] = useState<
        ProduccionUpdatePorSalon
    >(() => {
        if (typeof window === 'undefined') {
            return crearEstadoInicialPorSalon();
        }

        const estadoInicial = crearEstadoInicialPorSalon();
        const salonAKey = getPlanificacionAutoSaveStorageKey('A');
        const salonBKey = getPlanificacionAutoSaveStorageKey('B');

        estadoInicial.A = leerProduccionUpdateStorage(salonAKey);
        estadoInicial.B = leerProduccionUpdateStorage(salonBKey);

        if (estadoInicial.A.length === 0 && estadoInicial.B.length === 0) {
            const legacy = leerProduccionUpdateStorage(
                PLANIFICACION_AUTO_SAVE_LEGACY_STORAGE_KEY,
            );

            if (legacy.length > 0) {
                estadoInicial[salonActual] = legacy;
            }
        }

        return estadoInicial;
    });
    const [estadoAutoGuardado, setEstadoAutoGuardado] =
        useState<EstadoAutoGuardado>('idle');
    const [ultimaSincronizacionPorSalon, setUltimaSincronizacionPorSalon] =
        useState<Record<SalonPlanificacion, Date | null>>({
            A: null,
            B: null,
        });
    const ultimaFirmaGuardadaPorSalonRef = useRef<
        Record<SalonPlanificacion, string>
    >({
        A: '',
        B: '',
    });

    const produccionUpdate = produccionUpdatePorSalon[salonActual];

    const setProduccionUpdate = useCallback<
        Dispatch<SetStateAction<ProduccionChange[]>>
    >(
        (valueOrUpdater) => {
            setProduccionUpdatePorSalon((prev) => {
                const produccionActual = prev[salonActual] ?? [];
                const siguienteProduccion =
                    typeof valueOrUpdater === 'function'
                        ? valueOrUpdater(produccionActual)
                        : valueOrUpdater;

                if (siguienteProduccion === produccionActual) {
                    return prev;
                }

                return {
                    ...prev,
                    [salonActual]: siguienteProduccion,
                };
            });
        },
        [salonActual],
    );

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const salonKey = getPlanificacionAutoSaveStorageKey(salonActual);

        if (produccionUpdate.length === 0) {
            window.localStorage.removeItem(salonKey);
            return;
        }

        escribirProduccionUpdateStorage(salonKey, produccionUpdate);

        if (
            window.localStorage.getItem(
                PLANIFICACION_AUTO_SAVE_LEGACY_STORAGE_KEY,
            ) !== null
        ) {
            window.localStorage.removeItem(
                PLANIFICACION_AUTO_SAVE_LEGACY_STORAGE_KEY,
            );
        }
    }, [produccionUpdate, salonActual]);

    useEffect(() => {
        const cambiosPendientes = sanitizarProduccionUpdate(produccionUpdate);

        if (cambiosPendientes.length === 0) {
            setEstadoAutoGuardado('idle');
            return;
        }

        const firmaPendiente = construirFirmaProduccion(cambiosPendientes);
        const firmaGuardada =
            ultimaFirmaGuardadaPorSalonRef.current[salonActual];

        if (firmaPendiente === firmaGuardada) {
            setEstadoAutoGuardado('saved');
            return;
        }

        setEstadoAutoGuardado('pending');

        const timerId = window.setTimeout(async () => {
            setEstadoAutoGuardado('saving');

            try {
                await guardarPlanificacion({
                    salon: salonActual,
                    produccion: cambiosPendientes,
                    observaciones: [],
                    fechaInicio: fechaInicioPlanificacion,
                });

                const cambiosPorClave = new Map(
                    cambiosPendientes.map((item) => [
                        construirClaveProduccion(item),
                        item,
                    ]),
                );

                setProduccion((prevProduccion) =>
                    mergeProduccionGuardada(prevProduccion, cambiosPendientes),
                );
                setProduccionUpdate((prevCambios) =>
                    prevCambios.filter((item) => {
                        const platoCodigo = String(
                            item?.platoCodigo ?? '',
                        ).trim();
                        const platoPadreCodigo = String(
                            item?.platoPadreCodigo ?? '',
                        ).trim();
                        const fecha = String(item?.fecha ?? '').trim();

                        if (!platoCodigo || !fecha) {
                            return true;
                        }

                        const clave = construirClaveProduccion({
                            platoCodigo,
                            platoPadreCodigo,
                            fecha,
                        });
                        const cantidadGuardada = cambiosPorClave.get(clave);

                        if (cantidadGuardada === undefined) {
                            return true;
                        }

                        if (esCambioEliminacion(cantidadGuardada)) {
                            return !esCambioEliminacion(item);
                        }

                        const cantidadActual = Number(item?.cantidad);

                        if (!Number.isFinite(cantidadActual)) {
                            return true;
                        }

                        return (
                            Number(cantidadActual.toFixed(2)) !==
                            cantidadGuardada.cantidad
                        );
                    }),
                );

                ultimaFirmaGuardadaPorSalonRef.current[salonActual] =
                    firmaPendiente;
                setUltimaSincronizacionPorSalon((prev) => ({
                    ...prev,
                    [salonActual]: new Date(),
                }));
                setEstadoAutoGuardado('saved');
            } catch {
                setEstadoAutoGuardado('error');
            }
        }, PLANIFICACION_AUTO_SAVE_DELAY_MS);

        return () => window.clearTimeout(timerId);
    }, [
        fechaInicioPlanificacion,
        produccionUpdate,
        salonActual,
        setProduccion,
        setProduccionUpdate,
    ]);

    return {
        estadoAutoGuardado,
        produccionUpdate,
        setProduccionUpdate,
        ultimaSincronizacion:
            ultimaSincronizacionPorSalon[salonActual] ?? null,
    };
}
