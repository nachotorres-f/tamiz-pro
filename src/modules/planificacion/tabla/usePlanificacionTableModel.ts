'use client';

import { format } from 'date-fns';
import { useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type {
    EventoPlanificacion,
    ObservacionPlanificacion,
    PlanificacionFilaBase,
    PlanificacionIngrediente,
    ProduccionChange,
    ProduccionPlanificacion,
} from '@/modules/planificacion/types';
import {
    ANCHO_DIA,
    HEIGHT_HEADER_DIAS,
    HEIGHT_TD,
    STICKY_COLUMN_WIDTHS,
    construirClaveCelda,
    construirClaveFila,
    obtenerClaveDia,
    sumarCantidad,
    type DiaVisible,
    type FilaPlanificacionModel,
    type StyleHeaderDiaFn,
    type StyleHeaderStickyFn,
    type StyleStickyFn,
} from './planificacionTable.shared';

export function usePlanificacionTableModel({
    canEdit,
    datos,
    diaActivo,
    diasSemana,
    eventos,
    maxCantidadEventosDia,
    observaciones,
    platosFiltrados,
    produccion,
    produccionUpdate,
}: {
    canEdit: boolean;
    datos: PlanificacionIngrediente[];
    diaActivo: string;
    diasSemana: Date[];
    eventos: EventoPlanificacion[];
    maxCantidadEventosDia: number;
    observaciones: ObservacionPlanificacion[];
    platosFiltrados: PlanificacionFilaBase[];
    produccion: ProduccionPlanificacion[];
    produccionUpdate: ProduccionChange[];
}) {
    const diasVisibles = useMemo<DiaVisible[]>(
        () =>
            diasSemana
                .map((dia, indexOriginal) => ({
                    dia,
                    fechaClave: obtenerClaveDia(dia),
                    indexOriginal,
                }))
                .filter(
                    ({ dia }) =>
                        !diaActivo || format(dia, 'yyyy-MM-dd') === diaActivo,
                ),
        [diaActivo, diasSemana],
    );

    const indiceDiaPorClave = useMemo(
        () =>
            new Map<string, number>(
                diasSemana.map((dia, index) => [obtenerClaveDia(dia), index]),
            ),
        [diasSemana],
    );

    const consumoPorCelda = useMemo(() => {
        const cantidades = new Map<string, number>();
        const totales = new Map<string, number>();

        for (const item of datos) {
            const filaKey = construirClaveFila(
                String(item?.platoCodigo ?? ''),
                String(item?.platoPadreCodigo ?? ''),
            );
            const fechaClave = obtenerClaveDia(item.fecha);
            const celdaKey = construirClaveCelda(filaKey, fechaClave);
            const cantidad = Number(item?.cantidad ?? 0);

            cantidades.set(
                celdaKey,
                Number(((cantidades.get(celdaKey) ?? 0) + cantidad).toFixed(2)),
            );
            totales.set(
                filaKey,
                Number(((totales.get(filaKey) ?? 0) + cantidad).toFixed(2)),
            );
        }

        return { cantidades, totales };
    }, [datos]);

    const produccionPersistidaPorFila = useMemo(() => {
        const registrosPorCelda = new Map<string, ProduccionPlanificacion[]>();
        const registrosPorFila = new Map<string, ProduccionPlanificacion[]>();
        const observacionPorFila = new Map<string, string>();

        for (const item of produccion) {
            const filaKey = construirClaveFila(
                item.platoCodigo,
                item.platoPadreCodigo,
            );
            const fechaClave = obtenerClaveDia(item.fecha, true);
            const celdaKey = construirClaveCelda(filaKey, fechaClave);
            const registrosCelda = registrosPorCelda.get(celdaKey) ?? [];
            registrosCelda.push(item);
            registrosPorCelda.set(celdaKey, registrosCelda);

            const registrosFila = registrosPorFila.get(filaKey) ?? [];
            registrosFila.push(item);
            registrosPorFila.set(filaKey, registrosFila);

            if (item.observacion && !observacionPorFila.has(filaKey)) {
                observacionPorFila.set(filaKey, item.observacion);
            }
        }

        return {
            observacionPorFila,
            registrosPorCelda,
            registrosPorFila,
        };
    }, [produccion]);

    const cambiosPendientesPorCelda = useMemo(() => {
        const cambios = new Map<string, ProduccionChange[]>();

        for (const item of produccionUpdate) {
            const filaKey = construirClaveFila(
                item.platoCodigo,
                item.platoPadreCodigo,
            );
            const fechaClave = obtenerClaveDia(item.fecha, true);
            const celdaKey = construirClaveCelda(filaKey, fechaClave);
            const itemsCelda = cambios.get(celdaKey) ?? [];
            itemsCelda.push(item);
            cambios.set(celdaKey, itemsCelda);
        }

        return cambios;
    }, [produccionUpdate]);

    const observacionPorFila = useMemo(() => {
        const observacionesMap = new Map<string, string>();

        for (const item of observaciones) {
            observacionesMap.set(
                construirClaveFila(item.platoCodigo, item.platoPadreCodigo),
                item.observacion,
            );
        }

        return observacionesMap;
    }, [observaciones]);

    const eventosPorFecha = useMemo(() => {
        const eventosMap = new Map<string, EventoPlanificacion[]>();

        for (const evento of eventos) {
            const fechaClave = obtenerClaveDia(evento.fecha);
            const eventosFecha = eventosMap.get(fechaClave) ?? [];
            eventosFecha.push(evento);
            eventosMap.set(fechaClave, eventosFecha);
        }

        return eventosMap;
    }, [eventos]);

    const filasPlanificacion = useMemo<FilaPlanificacionModel[]>(
        () =>
            platosFiltrados.map(
                (
                    { plato, platoCodigo, platoPadre, platoPadreCodigo },
                    rowIndex,
                ) => {
                    const rowKey = construirClaveFila(
                        platoCodigo,
                        platoPadreCodigo,
                    );
                    const produccionFila =
                        produccionPersistidaPorFila.registrosPorFila.get(
                            rowKey,
                        ) ?? [];
                    const totalNecesario =
                        consumoPorCelda.totales.get(rowKey) ?? 0;
                    const totalProducidoConsiderado = Number(
                        produccionFila
                            .reduce((sum, item) => {
                                const indexOriginal = indiceDiaPorClave.get(
                                    obtenerClaveDia(item.fecha, true),
                                );

                                if (
                                    indexOriginal !== undefined &&
                                    indexOriginal < 4 &&
                                    item.esAnteriorACiclo
                                ) {
                                    return sum;
                                }

                                return sum + Number(item.cantidad ?? 0);
                            }, 0)
                            .toFixed(2),
                    );
                    const diferenciaTotal =
                        totalProducidoConsiderado - totalNecesario;
                    const claseColorTotal =
                        diferenciaTotal < -0.01
                            ? 'text-danger'
                            : diferenciaTotal > 0.01
                              ? 'text-success'
                              : 'text-dark';

                    const cells = diasVisibles.map(
                        ({ fechaClave, indexOriginal }) => {
                            const celdaKey = construirClaveCelda(
                                rowKey,
                                fechaClave,
                            );
                            const registrosPersistidos =
                                produccionPersistidaPorFila.registrosPorCelda.get(
                                    celdaKey,
                                ) ?? [];
                            const cantidadPersistida =
                                sumarCantidad(registrosPersistidos);
                            const cantidadAnteriorACiclo = sumarCantidad(
                                registrosPersistidos.filter(
                                    (item) => item.esAnteriorACiclo,
                                ),
                            );
                            const cambiosPendientes =
                                cambiosPendientesPorCelda.get(celdaKey) ?? [];

                            let cantidad: number | string =
                                registrosPersistidos.length > 0
                                    ? cantidadPersistida
                                    : '';
                            let updateCant = false;

                            if (cambiosPendientes.length > 0) {
                                updateCant = true;
                                const tieneEliminacion = cambiosPendientes.some(
                                    (item) =>
                                        item.eliminar === true ||
                                        item.cantidad === null,
                                );

                                cantidad = tieneEliminacion
                                    ? ''
                                    : sumarCantidad(cambiosPendientes);
                            }

                            const mostrarComoAnteriorACiclo =
                                indexOriginal < 4 &&
                                !updateCant &&
                                cantidadPersistida > 0 &&
                                cantidadAnteriorACiclo > 0 &&
                                Math.abs(
                                    cantidadPersistida - cantidadAnteriorACiclo,
                                ) < 0.01;

                            const totalConsumo =
                                consumoPorCelda.cantidades.get(celdaKey) ?? 0;
                            const valorInput = mostrarComoAnteriorACiclo
                                ? ''
                                : cantidad;
                            const badgeNecesarioArrastrable =
                                !mostrarComoAnteriorACiclo &&
                                totalConsumo > 0 &&
                                canEdit;

                            const badgeDerecho = mostrarComoAnteriorACiclo
                                ? {
                                      className:
                                          'planificacion-badge-anterior-ciclo',
                                      texto: cantidadAnteriorACiclo.toFixed(2),
                                      title: 'Cantidad decidida antes del ciclo actual',
                                  }
                                : totalConsumo > 0
                                  ? {
                                        className:
                                            'planificacion-badge-necesario',
                                        draggable: badgeNecesarioArrastrable,
                                        texto: totalConsumo.toFixed(2),
                                        title: 'Cantidad necesaria para este día',
                                        value: totalConsumo,
                                    }
                                  : null;

                            return {
                                badgeDerecho,
                                cellKey: celdaKey,
                                fechaClave,
                                indexOriginal,
                                placeholderArrastrable:
                                    canEdit &&
                                    valorInput === '' &&
                                    totalConsumo > 0,
                                totalConsumo,
                                updateCant,
                                valorInput,
                            };
                        },
                    );

                    return {
                        cells,
                        claseColorTotal,
                        observacionActual:
                            observacionPorFila.get(rowKey) ||
                            produccionPersistidaPorFila.observacionPorFila.get(
                                rowKey,
                            ) ||
                            '',
                        plato,
                        platoCodigo,
                        platoPadre,
                        platoPadreCodigo,
                        rowBackgroundColor:
                            rowIndex % 2 === 0 ? '#ffffff' : '#f8f9fa',
                        rowKey,
                        totalNecesario,
                    };
                },
            ),
        [
            cambiosPendientesPorCelda,
            canEdit,
            consumoPorCelda.cantidades,
            consumoPorCelda.totales,
            diasVisibles,
            indiceDiaPorClave,
            observacionPorFila,
            platosFiltrados,
            produccionPersistidaPorFila.observacionPorFila,
            produccionPersistidaPorFila.registrosPorCelda,
            produccionPersistidaPorFila.registrosPorFila,
        ],
    );

    const cantidadFilasCabeceraSuperior = Math.max(maxCantidadEventosDia, 1);
    const indiceFilaTitulos = cantidadFilasCabeceraSuperior;

    const stickyColumnLefts = useMemo(
        () =>
            [
                '0px',
                STICKY_COLUMN_WIDTHS[0],
                `calc(${STICKY_COLUMN_WIDTHS[0]} + ${STICKY_COLUMN_WIDTHS[1]})`,
                `calc(${STICKY_COLUMN_WIDTHS[0]} + ${STICKY_COLUMN_WIDTHS[1]} + ${STICKY_COLUMN_WIDTHS[2]})`,
            ] as const,
        [],
    );

    const styleCeldaBase = useMemo<CSSProperties>(
        () => ({
            height: HEIGHT_TD,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            verticalAlign: 'middle',
            whiteSpace: 'nowrap',
        }),
        [],
    );

    const styleCeldaDia = useMemo<CSSProperties>(
        () => ({
            ...styleCeldaBase,
            maxWidth: ANCHO_DIA,
            minWidth: ANCHO_DIA,
            width: ANCHO_DIA,
        }),
        [styleCeldaBase],
    );

    const styleHeaderDiasBase = useMemo<CSSProperties>(
        () => ({
            ...styleCeldaBase,
            fontSize: '0.95rem',
            height: HEIGHT_HEADER_DIAS,
            lineHeight: 1.1,
            paddingBottom: '0.25rem',
            paddingTop: '0.25rem',
        }),
        [styleCeldaBase],
    );

    const obtenerTopSticky = useCallback(
        (headerIndex: number) => `calc(${headerIndex} * ${HEIGHT_TD})`,
        [],
    );

    const obtenerStyleStickyIzquierda = useCallback<StyleStickyFn>(
        (columnIndex, backgroundColor, extra = {}) => ({
            ...styleCeldaBase,
            backgroundColor,
            left: stickyColumnLefts[columnIndex],
            maxWidth: STICKY_COLUMN_WIDTHS[columnIndex],
            minWidth: STICKY_COLUMN_WIDTHS[columnIndex],
            position: 'sticky',
            width: STICKY_COLUMN_WIDTHS[columnIndex],
            zIndex: 3,
            ...extra,
        }),
        [stickyColumnLefts, styleCeldaBase],
    );

    const obtenerStyleHeaderStickyIzquierda = useCallback<StyleHeaderStickyFn>(
        (columnIndex, headerIndex, backgroundColor, extra = {}) => ({
            ...obtenerStyleStickyIzquierda(columnIndex, backgroundColor),
            top: obtenerTopSticky(headerIndex),
            zIndex: 8,
            ...(headerIndex === indiceFilaTitulos ? styleHeaderDiasBase : {}),
            ...extra,
        }),
        [
            indiceFilaTitulos,
            obtenerStyleStickyIzquierda,
            obtenerTopSticky,
            styleHeaderDiasBase,
        ],
    );

    const obtenerStyleHeaderDia = useCallback<StyleHeaderDiaFn>(
        (headerIndex, backgroundColor, extra = {}) => ({
            ...(headerIndex === indiceFilaTitulos
                ? {
                      ...styleCeldaDia,
                      ...styleHeaderDiasBase,
                  }
                : styleCeldaDia),
            backgroundColor,
            position: 'sticky',
            top: obtenerTopSticky(headerIndex),
            zIndex: 6,
            ...extra,
        }),
        [
            indiceFilaTitulos,
            obtenerTopSticky,
            styleCeldaDia,
            styleHeaderDiasBase,
        ],
    );

    const obtenerStyleTextoSticky = useCallback(
        (columnIndex: number): CSSProperties => ({
            maxWidth: `calc(${STICKY_COLUMN_WIDTHS[columnIndex]} - 1rem)`,
            width: `calc(${STICKY_COLUMN_WIDTHS[columnIndex]} - 1rem)`,
        }),
        [],
    );

    return {
        cantidadFilasCabeceraSuperior,
        diasVisibles,
        eventosPorFecha,
        filasPlanificacion,
        indiceFilaTitulos,
        layout: {
            obtenerStyleHeaderDia,
            obtenerStyleHeaderStickyIzquierda,
            obtenerStyleStickyIzquierda,
            obtenerStyleTextoSticky,
            styleCeldaDia,
        },
    };
}
