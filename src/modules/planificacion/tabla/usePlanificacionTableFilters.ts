'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Slide, toast } from 'react-toastify';
import type { PlanificacionFilaBase } from '@/modules/planificacion/types';
import {
    construirValorFiltro,
    esperarSiguientePintado,
    type OpcionFiltro,
} from './planificacionTable.shared';

export function usePlanificacionTableFilters({
    platosUnicos,
}: {
    platosUnicos: PlanificacionFilaBase[];
}) {
    const [filtroPlato, setFiltroPlato] = useState('');
    const [filtroElaboracion, setFiltroElaboracion] = useState('');
    const [limpiandoFiltros, setLimpiandoFiltros] = useState(false);

    const opcionesPlato = useMemo<OpcionFiltro[]>(
        () =>
            Array.from(
                new Map(
                    platosUnicos.map((item) => [
                        construirValorFiltro(
                            item.platoPadreCodigo,
                            item.platoPadre,
                        ),
                        {
                            label: item.platoPadre,
                            value: construirValorFiltro(
                                item.platoPadreCodigo,
                                item.platoPadre,
                            ),
                        },
                    ]),
                ).values(),
            ).sort((a, b) => a.label.localeCompare(b.label, 'es')),
        [platosUnicos],
    );

    const opcionesElaboracion = useMemo<OpcionFiltro[]>(
        () =>
            Array.from(
                new Map(
                    platosUnicos
                        .filter(
                            (item) =>
                                !filtroPlato ||
                                construirValorFiltro(
                                    item.platoPadreCodigo,
                                    item.platoPadre,
                                ) === filtroPlato,
                        )
                        .map((item) => [
                            construirValorFiltro(item.platoCodigo, item.plato),
                            {
                                label: item.plato,
                                value: construirValorFiltro(
                                    item.platoCodigo,
                                    item.plato,
                                ),
                            },
                        ]),
                ).values(),
            ).sort((a, b) => a.label.localeCompare(b.label, 'es')),
        [filtroPlato, platosUnicos],
    );

    useEffect(() => {
        if (
            filtroElaboracion &&
            !opcionesElaboracion.some(
                (opcion) => opcion.value === filtroElaboracion,
            )
        ) {
            setFiltroElaboracion('');
        }
    }, [filtroElaboracion, opcionesElaboracion]);

    const platosFiltrados = useMemo(
        () =>
            platosUnicos.filter((item) => {
                const coincidePlato =
                    !filtroPlato ||
                    construirValorFiltro(
                        item.platoPadreCodigo,
                        item.platoPadre,
                    ) === filtroPlato;
                const coincideElaboracion =
                    !filtroElaboracion ||
                    construirValorFiltro(item.platoCodigo, item.plato) ===
                        filtroElaboracion;

                return coincidePlato && coincideElaboracion;
            }),
        [filtroElaboracion, filtroPlato, platosUnicos],
    );

    const handleLimpiarFiltros = useCallback(async () => {
        if (!filtroPlato && !filtroElaboracion) {
            return;
        }

        const toastId = toast.loading('Limpiando filtros', {
            position: 'bottom-right',
            theme: 'colored',
            transition: Slide,
            type: 'info',
        });

        setLimpiandoFiltros(true);

        try {
            await esperarSiguientePintado();

            setFiltroPlato('');
            setFiltroElaboracion('');

            await esperarSiguientePintado();

            toast.update(toastId, {
                autoClose: 2500,
                closeOnClick: true,
                draggable: true,
                isLoading: false,
                render: 'Filtros limpiados',
                type: 'success',
            });
        } catch {
            toast.update(toastId, {
                autoClose: 4000,
                closeOnClick: true,
                draggable: true,
                isLoading: false,
                render: 'Error al limpiar filtros',
                type: 'error',
            });
        } finally {
            setLimpiandoFiltros(false);
        }
    }, [filtroElaboracion, filtroPlato]);

    return {
        filtroElaboracion,
        filtroPlato,
        handleLimpiarFiltros,
        limpiandoFiltros,
        opcionesElaboracion,
        opcionesPlato,
        platosFiltrados,
        setFiltroElaboracion,
        setFiltroPlato,
    };
}
