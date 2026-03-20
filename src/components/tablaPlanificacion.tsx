/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    Button,
    FloatingLabel,
    Form,
    Modal,
    OverlayTrigger,
    Spinner,
    Table,
    Tooltip,
} from 'react-bootstrap';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlatoDetalle } from './platoDetalle';
import {
    ArrowsFullscreen,
    ChatRightText,
    FullscreenExit,
} from 'react-bootstrap-icons';
import type {
    EventoPlanificacion,
    ObservacionPlanificacion,
    ProduccionChange,
    ProduccionPlanificacion,
} from '@/app/planificacion/page';
import { RolContext } from './filtroPlatos';

function abreviar(lugar: string) {
    if (lugar === 'El Central') return 'CEN';
    if (lugar === 'La Rural') return 'RUR';
    if (lugar === 'Rüt Haus') return 'RUT';
    if (lugar === 'Origami') return 'ORI';
}

function formatFecha(dia: Date) {
    const nombreDia = format(dia, 'EEEE', { locale: es });
    const letraDia = nombreDia.startsWith('mi')
        ? 'X'
        : nombreDia.charAt(0).toUpperCase();
    const diaNumero = format(dia, 'd');
    const mesNumero = format(dia, 'M');
    return `${letraDia} ${diaNumero}-${mesNumero}`;
}

function normalizarFechaInicioDia(fecha: string | Date) {
    const normalizada = new Date(fecha);
    normalizada.setHours(0, 0, 0, 0);
    return normalizada;
}

function normalizarFechaProduccion(fecha: string | Date) {
    const normalizada = normalizarFechaInicioDia(fecha);
    normalizada.setDate(normalizada.getDate() + 1);
    return normalizada;
}

function obtenerClaveDia(fecha: string | Date, esFechaProduccion = false) {
    const normalizada = esFechaProduccion
        ? normalizarFechaProduccion(fecha)
        : normalizarFechaInicioDia(fecha);
    return format(normalizada, 'yyyy-MM-dd');
}

function sumarCantidad(items: Array<{ cantidad?: number | string | null }>) {
    return Number(
        items
            .reduce((sum, item) => sum + Number(item.cantidad ?? 0), 0)
            .toFixed(2),
    );
}

export function TablaPlanificacion({
    pageOcultos,
    platosUnicos,
    diasSemana,
    datos,
    filtro,
    diaActivo,
    platoExpandido,
    produccion,
    produccionUpdate,
    observaciones,
    eventos,
    maxCantidadEventosDia,
    setObservaciones,
    setProduccionUpdate,
    setEventoAdelantado,
}: // anchoButton,
// anchoPlato,
// anchoTotal,
{
    pageOcultos: boolean;
    platosUnicos: {
        plato: string;
        platoCodigo: string;
        platoPadre: string;
        platoPadreCodigo: string;
    }[];
    diasSemana: Date[];
    datos: any[];
    filtro: string;
    diaActivo: string;
    platoExpandido: string | null;
    produccion: ProduccionPlanificacion[];
    produccionUpdate: ProduccionChange[];
    observaciones: ObservacionPlanificacion[];
    eventos: EventoPlanificacion[];
    maxCantidadEventosDia: number;
    setObservaciones: (value: ObservacionPlanificacion[]) => void;
    setProduccion: React.Dispatch<
        React.SetStateAction<ProduccionPlanificacion[]>
    >;
    setProduccionUpdate: React.Dispatch<
        React.SetStateAction<ProduccionChange[]>
    >;
    // anchoButton: any;
    // anchoPlato: any;
    // anchoTotal: any;
    setPlatoExpandido: (value: string | null) => void;
    setEventoAdelantado: (value: number) => void;
}) {
    const RolProvider = useContext(RolContext);

    const [ocultos, setOcultos] = React.useState<Set<string>>(new Set());
    const [show, setShow] = useState(false);
    const [platoModal, setPlatoModal] = useState('');
    const [platoCodigoModal, setPlatoCodigoModal] = useState('');
    const [platoPadreModal, setPlatoPadreModal] = useState('');
    const [platoPadreCodigoModal, setPlatoPadreCodigoModal] = useState('');
    const [observacionModal, setObservacionModal] = useState('');
    const [adelantarEvento, setAdelantarEvento] = useState(0);
    const [platosAdelantados, setPlatosAdelantados] = useState<any[]>([]);
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
    const [isFullscreenTablas, setIsFullscreenTablas] = useState(false);
    const solicitudesAdelantoPendientesRef = useRef<Promise<boolean>[]>([]);
    const timerRefrescoPlanificacionRef = useRef<number | null>(null);
    const contenedorTablasRef = useRef<HTMLDivElement | null>(null);
    //const [primeraCargaModal, setPrimeraCargaModal] = useState(true);

    useEffect(() => {
        fetch('/api/ocultos')
            .then((res) => res.json())
            .then((ocultosDB) => setOcultos(new Set(ocultosDB)));
    }, []);

    // const ocultarPlato = async (plato: string) => {
    //     await fetch('/api/ocultos', {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify({ plato }),
    //     });
    //     setOcultos(new Set([...ocultos, plato]));
    // };

    // const mostrarPlato = async (plato: string) => {
    //     await fetch(`/api/ocultos?plato=${encodeURIComponent(plato)}`, {
    //         method: 'DELETE',
    //     });
    //     const nuevos = new Set(ocultos);
    //     nuevos.delete(plato);
    //     setOcultos(nuevos);
    // };

    const handleClose = () => setShow(false);

    const dispararActualizacionPlanificacion = (inmediato = false) => {
        if (timerRefrescoPlanificacionRef.current !== null) {
            window.clearTimeout(timerRefrescoPlanificacionRef.current);
            timerRefrescoPlanificacionRef.current = null;
        }

        if (inmediato) {
            setEventoAdelantado(Math.random());
            return;
        }

        timerRefrescoPlanificacionRef.current = window.setTimeout(() => {
            setEventoAdelantado(Math.random());
            timerRefrescoPlanificacionRef.current = null;
        }, 300);
    };

    useEffect(
        () => () => {
            if (timerRefrescoPlanificacionRef.current !== null) {
                window.clearTimeout(timerRefrescoPlanificacionRef.current);
            }
        },
        [],
    );

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreenTablas(
                document.fullscreenElement === contenedorTablasRef.current,
            );
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        handleFullscreenChange();

        return () => {
            document.removeEventListener(
                'fullscreenchange',
                handleFullscreenChange,
            );
        };
    }, []);

    const handleToggleFullscreenTablas = async () => {
        const contenedor = contenedorTablasRef.current;

        if (!contenedor) return;

        try {
            if (document.fullscreenElement === contenedor) {
                await document.exitFullscreen();
                return;
            }

            await contenedor.requestFullscreen();
        } catch (error) {
            console.error('No se pudo cambiar a pantalla completa:', error);
        }
    };

    useEffect(() => {
        if (adelantarEvento == 0) return;

        const abortController = new AbortController();
        setCargandoPlatosAdelantados(true);
        setPlatosAdelantados([]);

        fetch(`/api/planificacion/adelantarEvento?id=${adelantarEvento}`, {
            signal: abortController.signal,
        })
            .then((res) => res.json())
            .then((data) => {
                setPlatosAdelantados(data.Plato || []);
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

    const registrarSolicitudAdelanto = (solicitud: Promise<boolean>) => {
        solicitudesAdelantoPendientesRef.current.push(solicitud);
        void solicitud.finally(() => {
            solicitudesAdelantoPendientesRef.current =
                solicitudesAdelantoPendientesRef.current.filter(
                    (pendiente) => pendiente !== solicitud,
                );
        });
    };

    const actualizarAdelantoPlato = async (
        platoId: number,
        adelantar: boolean,
        fechaAnterior: any,
    ): Promise<boolean> => {
        setPlatosAdelantados((prev) =>
            prev.map((item) =>
                item.id === platoId
                    ? { ...item, fecha: adelantar ? new Date() : null }
                    : item,
            ),
        );
        setPlatosGuardandoAdelanto((prev) => {
            const next = new Set(prev);
            next.add(platoId);
            return next;
        });

        try {
            const response = await fetch(`/api/planificacion/adelantarEvento`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: platoId,
                    adelantar,
                }),
            });

            if (!response.ok) {
                throw new Error(
                    `No se pudo actualizar el plato ${platoId}. Status: ${response.status}`,
                );
            }
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
    };

    const handleToggleAdelantoTodo = async () => {
        if (adelantandoTodo || cargandoPlatosAdelantados) {
            return;
        }

        const todosAdelantados =
            platosAdelantados.length > 0 &&
            platosAdelantados.every((plato) => !!plato.fecha);
        const adelantar = !todosAdelantados;
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
    };

    const handleCloseAdelantar = async () => {
        if (cerrandoModalAdelanto) return;

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
    };

    const actualizarProduccionCelda = (
        plato: string,
        platoCodigo: string,
        platoPadre: string,
        platoPadreCodigo: string,
        fecha: string,
        valorInput: string,
    ) => {
        const nuevaProduccion = [...produccionUpdate];
        const index = nuevaProduccion.findIndex(
            (p) =>
                p.platoCodigo === platoCodigo &&
                p.platoPadreCodigo === platoPadreCodigo &&
                p.fecha === fecha,
        );

        if (valorInput === '') {
            const valorEliminado: ProduccionChange = {
                plato,
                platoCodigo,
                platoPadre,
                platoPadreCodigo,
                fecha,
                cantidad: null,
                eliminar: true as const,
            };

            if (index > -1) {
                nuevaProduccion[index] = valorEliminado;
            } else {
                nuevaProduccion.push(valorEliminado);
            }

            setProduccionUpdate(nuevaProduccion);
            return;
        }

        const cantidad = Number.parseFloat(valorInput.replace(',', '.'));

        if (!Number.isFinite(cantidad)) {
            return;
        }

        const valorActualizado: ProduccionChange = {
            plato,
            platoCodigo,
            platoPadre,
            platoPadreCodigo,
            fecha,
            cantidad: Number(cantidad.toFixed(2)),
            eliminar: false as const,
        };

        if (index > -1) {
            nuevaProduccion[index] = valorActualizado;
        } else {
            nuevaProduccion.push(valorActualizado);
        }

        setProduccionUpdate(nuevaProduccion);
    };

    type DragCantidadPayload = {
        mode: 'set' | 'add';
        value: number;
        platoCodigo: string;
        platoPadreCodigo: string;
    };

    const DRAG_CANTIDAD_MIME = 'application/x-tamiz-planificacion-cantidad';

    const iniciarDragCantidad = (
        event: React.DragEvent<HTMLElement>,
        payload: DragCantidadPayload,
    ) => {
        if (!Number.isFinite(payload.value)) {
            return;
        }

        const value = Number(payload.value.toFixed(2));
        const payloadNormalizado: DragCantidadPayload = {
            mode: payload.mode,
            value,
            platoCodigo: payload.platoCodigo,
            platoPadreCodigo: payload.platoPadreCodigo,
        };

        event.dataTransfer.setData(
            DRAG_CANTIDAD_MIME,
            JSON.stringify(payloadNormalizado),
        );
        event.dataTransfer.setData('text/plain', String(value));
        event.dataTransfer.effectAllowed = 'copy';
    };

    const obtenerDragCantidad = (
        dataTransfer: DataTransfer,
    ): DragCantidadPayload | null => {
        const dataCustom = dataTransfer.getData(DRAG_CANTIDAD_MIME);

        if (dataCustom) {
            try {
                const payload = JSON.parse(dataCustom) as Partial<DragCantidadPayload>;
                const mode = payload.mode;
                const value = Number(payload.value);
                const platoCodigo = String(payload.platoCodigo || '');
                const platoPadreCodigo = String(payload.platoPadreCodigo || '');

                if (
                    (mode === 'set' || mode === 'add') &&
                    Number.isFinite(value) &&
                    platoCodigo &&
                    platoPadreCodigo
                ) {
                    return {
                        mode,
                        value,
                        platoCodigo,
                        platoPadreCodigo,
                    };
                }
            } catch {}
        }

        return null;
    };

    const esMismaFilaDrag = (
        payload: DragCantidadPayload,
        {
            platoCodigo,
            platoPadreCodigo,
        }: {
            platoCodigo: string;
            platoPadreCodigo: string;
        },
    ) =>
        payload.platoCodigo === platoCodigo &&
        payload.platoPadreCodigo === platoPadreCodigo;

    const handleDragOverInputCantidad = (
        event: React.DragEvent<HTMLElement>,
        {
            platoCodigo,
            platoPadreCodigo,
        }: {
            platoCodigo: string;
            platoPadreCodigo: string;
        },
    ) => {
        if (RolProvider === 'consultor') {
            return;
        }

        const tipos = Array.from(event.dataTransfer.types || []);
        const esDragCompatible = tipos.includes(DRAG_CANTIDAD_MIME);

        if (!esDragCompatible) {
            return;
        }

        const payload = obtenerDragCantidad(event.dataTransfer);
        if (
            payload &&
            !esMismaFilaDrag(payload, {
                platoCodigo,
                platoPadreCodigo,
            })
        ) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    };

    const handleDropInputCantidad = (
        event: React.DragEvent<HTMLElement>,
        {
            plato,
            platoCodigo,
            platoPadre,
            platoPadreCodigo,
            fecha,
            cantidadActual,
        }: {
            plato: string;
            platoCodigo: string;
            platoPadre: string;
            platoPadreCodigo: string;
            fecha: string;
            cantidadActual: number | string;
        },
    ) => {
        if (RolProvider === 'consultor') {
            return;
        }

        const payload = obtenerDragCantidad(event.dataTransfer);

        if (!payload) {
            return;
        }

        event.preventDefault();
        if (
            !esMismaFilaDrag(payload, {
                platoCodigo,
                platoPadreCodigo,
            })
        ) {
            return;
        }

        const actual = Number(cantidadActual);
        const actualValido = Number.isFinite(actual) ? actual : null;
        const nuevoValor =
            payload.mode === 'add'
                ? Number(((actualValido ?? 0) + payload.value).toFixed(2))
                : Number(payload.value.toFixed(2));

        actualizarProduccionCelda(
            plato,
            platoCodigo,
            platoPadre,
            platoPadreCodigo,
            fecha,
            nuevoValor.toString(),
        );
    };

    const construirClaveFila = (
        platoCodigo: string,
        platoPadreCodigo: string,
    ) => `${platoCodigo}|||${platoPadreCodigo}`;

    const construirClaveCelda = (filaKey: string, fechaClave: string) =>
        `${filaKey}|||${fechaClave}`;

    const diasVisibles = useMemo(
        () =>
            diasSemana
                .map((dia, indexOriginal) => ({
                    dia,
                    diaLimpio: normalizarFechaInicioDia(dia),
                    indexOriginal,
                    fechaClave: obtenerClaveDia(dia),
                }))
                .filter(
                    ({ dia }) =>
                        !diaActivo ||
                        format(dia, 'yyyy-MM-dd') === diaActivo,
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

    const platosFiltrados = useMemo(
        () =>
            platosUnicos.filter(({ plato }) => {
                if (pageOcultos) {
                    return ocultos.has(plato);
                }

                if (ocultos.has(plato)) {
                    return false;
                }

                if (!filtro) {
                    return true;
                }

                return plato.toLowerCase().includes(filtro.toLowerCase());
            }),
        [filtro, ocultos, pageOcultos, platosUnicos],
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

            if (
                item.observacion &&
                !observacionPorFila.has(filaKey)
            ) {
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

    type BadgeCelda = {
        className: string;
        draggable?: boolean;
        texto: string;
        title: string;
        value?: number;
    };

    type CeldaPlanificacionModel = {
        badgeDerecho: BadgeCelda | null;
        fechaClave: string;
        indexOriginal: number;
        placeholderArrastrable: boolean;
        totalConsumo: number;
        updateCant: boolean;
        valorInput: number | string;
    };

    type FilaPlanificacionModel = {
        cells: CeldaPlanificacionModel[];
        claseColorTotal: string;
        observacionActual: string;
        plato: string;
        platoCodigo: string;
        platoPadre: string;
        platoPadreCodigo: string;
        rowBackgroundColor: string;
        rowKey: string;
        totalNecesario: number;
    };

    const filasPlanificacion = useMemo<FilaPlanificacionModel[]>(
        () =>
            platosFiltrados.map(
                (
                    {
                        plato,
                        platoCodigo,
                        platoPadre,
                        platoPadreCodigo,
                    },
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
                                        item?.eliminar === true ||
                                        item?.cantidad === null,
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
                                    cantidadPersistida -
                                        cantidadAnteriorACiclo,
                                ) < 0.01;

                            const totalConsumo =
                                consumoPorCelda.cantidades.get(celdaKey) ?? 0;
                            const valorInput = mostrarComoAnteriorACiclo
                                ? ''
                                : cantidad;
                            const badgeNecesarioArrastrable =
                                !mostrarComoAnteriorACiclo &&
                                totalConsumo > 0 &&
                                RolProvider !== 'consultor';

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
                                fechaClave,
                                indexOriginal,
                                placeholderArrastrable:
                                    RolProvider !== 'consultor' &&
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
            RolProvider,
            cambiosPendientesPorCelda,
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

    const todosAdelantados =
        platosAdelantados.length > 0 &&
        platosAdelantados.every((plato) => !!plato.fecha);

    const heightTd = '3rem';
    const stickyColumnWidths = ['3.5rem', '15rem', '15rem', '7rem'] as const;
    const stickyColumnLefts = [
        '0px',
        stickyColumnWidths[0],
        `calc(${stickyColumnWidths[0]} + ${stickyColumnWidths[1]})`,
        `calc(${stickyColumnWidths[0]} + ${stickyColumnWidths[1]} + ${stickyColumnWidths[2]})`,
    ] as const;
    const anchoDia = '15rem';
    const totalColumnasPlanificacion =
        stickyColumnWidths.length + diasVisibles.length;

    const styleCeldaBase: React.CSSProperties = {
        height: heightTd,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
    };

    const styleCeldaDia: React.CSSProperties = {
        ...styleCeldaBase,
        maxWidth: anchoDia,
        minWidth: anchoDia,
        width: anchoDia,
    };

    const obtenerTopSticky = (headerIndex: number) =>
        `calc(${headerIndex} * ${heightTd})`;

    const obtenerStyleStickyIzquierda = (
        columnIndex: number,
        backgroundColor: string,
        extra: React.CSSProperties = {},
    ): React.CSSProperties => ({
        ...styleCeldaBase,
        backgroundColor,
        left: stickyColumnLefts[columnIndex],
        maxWidth: stickyColumnWidths[columnIndex],
        minWidth: stickyColumnWidths[columnIndex],
        position: 'sticky',
        width: stickyColumnWidths[columnIndex],
        zIndex: 3,
        ...extra,
    });

    const obtenerStyleHeaderStickyIzquierda = (
        columnIndex: number,
        headerIndex: number,
        backgroundColor: string,
        extra: React.CSSProperties = {},
    ): React.CSSProperties => ({
        ...obtenerStyleStickyIzquierda(columnIndex, backgroundColor, extra),
        top: obtenerTopSticky(headerIndex),
        zIndex: 8,
    });

    const obtenerStyleHeaderDia = (
        headerIndex: number,
        backgroundColor: string,
        extra: React.CSSProperties = {},
    ): React.CSSProperties => ({
        ...styleCeldaDia,
        backgroundColor,
        position: 'sticky',
        top: obtenerTopSticky(headerIndex),
        zIndex: 6,
        ...extra,
    });

    return (
        <>
            <Modal
                show={show}
                onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        Observacion - {platoModal} - {platoPadreModal}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <FloatingLabel
                        controlId="floatingTextarea"
                        label="Observación"
                        className="mb-3">
                        <Form.Control
                            as="textarea"
                            value={observacionModal}
                            onChange={(
                                e: React.ChangeEvent<
                                    HTMLInputElement | HTMLTextAreaElement
                                >,
                            ) => {
                                setObservacionModal(e.target.value);
                            }}
                            style={{ height: '200px' }}
                        />
                    </FloatingLabel>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setObservacionModal('');
                            handleClose();
                        }}>
                        Cerrar
                    </Button>
                    {RolProvider !== 'consultor' && (
                        <Button
                            variant="primary"
                            onClick={() => {
                                const obsExistente = observaciones.find(
                                    (o) =>
                                        o.platoCodigo === platoCodigoModal &&
                                        o.platoPadreCodigo ===
                                            platoPadreCodigoModal,
                                );
                                if (obsExistente) {
                                    obsExistente.observacion = observacionModal;
                                    setObservaciones([
                                        ...observaciones.filter(
                                            (o) =>
                                                !(
                                                    o.platoCodigo ===
                                                        platoCodigoModal &&
                                                    o.platoPadreCodigo ===
                                                        platoPadreCodigoModal
                                                ),
                                        ),
                                        obsExistente,
                                    ]);
                                } else {
                                    setObservaciones([
                                        ...observaciones,
                                        {
                                            plato: platoModal,
                                            platoCodigo: platoCodigoModal,
                                            platoPadre: platoPadreModal,
                                            platoPadreCodigo:
                                                platoPadreCodigoModal,
                                            observacion: observacionModal,
                                        },
                                    ]);
                                }
                                setObservacionModal('');
                                handleClose();
                            }}>
                            Guardar Cambios
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>

            <Modal
                size="lg"
                show={adelantarEvento != 0}
                onHide={() => {
                    void handleCloseAdelantar();
                }}>
                <Modal.Header closeButton>
                    <Modal.Title>Adelantar Plato Evento</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {cargandoPlatosAdelantados ? (
                        <div className="d-flex align-items-center gap-2 text-muted">
                            <Spinner
                                animation="border"
                                size="sm"
                            />
                            <span>Cargando platos...</span>
                        </div>
                    ) : platosAdelantados.length > 0 ? (
                        <>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <small className="text-muted">
                                    {adelantandoTodo ||
                                    platosGuardandoAdelanto.size > 0
                                        ? 'Actualizando adelantos y planificación...'
                                        : 'Marcá los platos que querés adelantar para ver el impacto en la tabla.'}
                                </small>
                                <Button
                                    size="sm"
                                    variant="primary"
                                    disabled={
                                        cerrandoModalAdelanto ||
                                        adelantandoTodo ||
                                        platosGuardandoAdelanto.size > 0
                                    }
                                    onClick={() => {
                                        void handleToggleAdelantoTodo();
                                    }}>
                                    {adelantandoTodo
                                        ? accionMasivaAdelanto ===
                                          'desadelantar'
                                            ? 'Quitando adelantos...'
                                            : 'Adelantando...'
                                        : todosAdelantados
                                          ? 'Quitar adelanto a todo'
                                          : 'Adelantar todo'}
                                </Button>
                            </div>
                            <Table>
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Cantidad</th>
                                        <th>Adelantar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {platosAdelantados.map((plato) => (
                                        <tr key={plato.id}>
                                            <td>{plato.nombre}</td>
                                            <td>{plato.cantidad}</td>
                                            <td>
                                                <Form.Check
                                                    type="checkbox"
                                                    checked={!!plato.fecha}
                                                    disabled={
                                                        cerrandoModalAdelanto ||
                                                        adelantandoTodo ||
                                                        platosGuardandoAdelanto.has(
                                                            plato.id,
                                                        )
                                                    }
                                                    onChange={(e) => {
                                                        const solicitud =
                                                            actualizarAdelantoPlato(
                                                                plato.id,
                                                                e.target
                                                                    .checked,
                                                                plato.fecha,
                                                            );
                                                        registrarSolicitudAdelanto(
                                                            solicitud,
                                                        );
                                                        void solicitud.then(
                                                            (actualizado) => {
                                                                if (
                                                                    actualizado
                                                                ) {
                                                                    dispararActualizacionPlanificacion();
                                                                }
                                                            },
                                                        );
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </>
                    ) : (
                        <p>No hay platos para adelantar.</p>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        disabled={
                            cerrandoModalAdelanto ||
                            adelantandoTodo ||
                            platosGuardandoAdelanto.size > 0
                        }
                        onClick={() => {
                            void handleCloseAdelantar();
                        }}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>

            <div
                ref={contenedorTablasRef}
                className="no-scrollbar"
                style={{
                    maxHeight: isFullscreenTablas ? '100vh' : '90vh',
                    height: isFullscreenTablas ? '100vh' : undefined,
                    overflow: 'auto',
                    backgroundColor: '#fff',
                }}>
                <Table
                    style={{
                        width: 'max-content',
                        minWidth: '100%',
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                    }}
                    className="planificacion-tabla-unificada mb-0"
                    size="sm"
                    striped>
                    <thead>
                        {Array.from({ length: maxCantidadEventosDia }).map(
                            (_, headerIndex) => (
                                <tr key={`evento-header-${headerIndex}`}>
                                    {stickyColumnWidths.map((_, columnIndex) => (
                                        <th
                                            key={`evento-header-empty-${headerIndex}-${columnIndex}`}
                                            style={obtenerStyleHeaderStickyIzquierda(
                                                columnIndex,
                                                headerIndex,
                                                '#ffffff',
                                                {
                                                    border: 'none',
                                                },
                                            )}>
                                            &nbsp;
                                        </th>
                                    ))}
                                    {diasVisibles.map(
                                        ({ fechaClave, indexOriginal }) => {
                                            const eventosDia =
                                                eventosPorFecha.get(fechaClave) ??
                                                [];
                                            const offset =
                                                maxCantidadEventosDia -
                                                eventosDia.length;
                                            const eventoIndex =
                                                headerIndex - offset;
                                            const evento =
                                                eventoIndex >= 0
                                                    ? eventosDia[eventoIndex]
                                                    : null;

                                            return (
                                                <th
                                                    className={
                                                        evento
                                                            ? 'link-pdf'
                                                            : undefined
                                                    }
                                                    onClick={() => {
                                                        if (
                                                            !evento ||
                                                            RolProvider ===
                                                                'consultor'
                                                        ) {
                                                            return;
                                                        }

                                                        setAdelantarEvento(
                                                            evento.id,
                                                        );
                                                    }}
                                                    key={`evento-header-${indexOriginal}-${headerIndex}`}
                                                    style={obtenerStyleHeaderDia(
                                                        headerIndex,
                                                        '#ffffff',
                                                        {
                                                            border: 'none',
                                                            fontWeight:
                                                                'normal',
                                                        },
                                                    )}>
                                                    {evento
                                                        ? `${abreviar(evento.lugar)} - ${evento.salon}`
                                                        : '\u00A0'}
                                                </th>
                                            );
                                        },
                                    )}
                                </tr>
                            ),
                        )}
                        <tr style={{ textAlign: 'center' }}>
                            <th
                                style={obtenerStyleHeaderStickyIzquierda(
                                    0,
                                    maxCantidadEventosDia,
                                    '#BDBDBD',
                                    {
                                        textAlign: 'center',
                                    },
                                )}>
                                <Button
                                    size="sm"
                                    variant="outline-dark"
                                    onClick={() => {
                                        void handleToggleFullscreenTablas();
                                    }}
                                    title={
                                        isFullscreenTablas
                                            ? 'Salir de pantalla completa'
                                            : 'Ver en pantalla completa'
                                    }
                                    aria-label={
                                        isFullscreenTablas
                                            ? 'Salir de pantalla completa'
                                            : 'Ver en pantalla completa'
                                    }
                                    style={{
                                        width: '1.5rem',
                                        height: '1.5rem',
                                        display: 'inline-flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        fontSize: '0.75rem',
                                        padding: 0,
                                    }}>
                                    {isFullscreenTablas ? (
                                        <FullscreenExit />
                                    ) : (
                                        <ArrowsFullscreen />
                                    )}
                                </Button>
                            </th>
                            <th
                                style={obtenerStyleHeaderStickyIzquierda(
                                    1,
                                    maxCantidadEventosDia,
                                    '#BDBDBD',
                                )}>
                                Plato
                            </th>
                            <th
                                style={obtenerStyleHeaderStickyIzquierda(
                                    2,
                                    maxCantidadEventosDia,
                                    '#BDBDBD',
                                )}>
                                Elaboracion
                            </th>
                            <th
                                style={obtenerStyleHeaderStickyIzquierda(
                                    3,
                                    maxCantidadEventosDia,
                                    '#BDBDBD',
                                )}>
                                Total
                            </th>
                            {diasVisibles.map(
                                ({ dia, indexOriginal, fechaClave }) => (
                                    <th
                                        key={fechaClave}
                                        style={obtenerStyleHeaderDia(
                                            maxCantidadEventosDia,
                                            indexOriginal < 11
                                                ? 'rgb(255, 255, 0)'
                                                : '#BDBDBD',
                                            {
                                                fontWeight: 700,
                                                textAlign: 'center',
                                            },
                                        )}>
                                        {formatFecha(dia)}
                                    </th>
                                ),
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {filasPlanificacion.map((fila) => (
                            <React.Fragment key={fila.rowKey}>
                                <tr style={{ textAlign: 'center' }}>
                                    <td
                                        style={obtenerStyleStickyIzquierda(
                                            0,
                                            fila.rowBackgroundColor,
                                            {
                                                textAlign: 'center',
                                            },
                                        )}>
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            style={{
                                                width: '2rem',
                                                height: '2.2rem',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                            }}
                                            onClick={() => {
                                                const observacionActual =
                                                    observaciones.find(
                                                        (o) =>
                                                            o.platoCodigo ===
                                                                fila.platoCodigo &&
                                                            o.platoPadreCodigo ===
                                                                fila.platoPadreCodigo,
                                                    )?.observacion ||
                                                    observacionModal;

                                                if (observacionActual) {
                                                    setObservacionModal(
                                                        observacionActual,
                                                    );
                                                } else {
                                                    setObservacionModal(
                                                        produccionPersistidaPorFila.observacionPorFila.get(
                                                            fila.rowKey,
                                                        ) || '',
                                                    );
                                                }

                                                setPlatoModal(fila.plato);
                                                setPlatoCodigoModal(
                                                    fila.platoCodigo,
                                                );
                                                setPlatoPadreModal(
                                                    fila.platoPadre,
                                                );
                                                setPlatoPadreCodigoModal(
                                                    fila.platoPadreCodigo,
                                                );
                                                setShow(true);
                                            }}>
                                            <ChatRightText />
                                        </Button>
                                    </td>
                                    <td
                                        style={obtenerStyleStickyIzquierda(
                                            1,
                                            fila.rowBackgroundColor,
                                        )}>
                                        <OverlayTrigger
                                            overlay={
                                                <Tooltip
                                                    id={`${fila.plato}-${fila.platoPadre}`}>
                                                    {fila.platoPadre}
                                                </Tooltip>
                                            }>
                                            <span>{fila.platoPadre}</span>
                                        </OverlayTrigger>
                                    </td>
                                    <td
                                        style={obtenerStyleStickyIzquierda(
                                            2,
                                            fila.rowBackgroundColor,
                                        )}>
                                        <OverlayTrigger
                                            overlay={
                                                <Tooltip
                                                    id={`${fila.platoPadre}-${fila.plato}`}>
                                                    {fila.plato}
                                                </Tooltip>
                                            }>
                                            <span>{fila.plato}</span>
                                        </OverlayTrigger>
                                    </td>
                                    <td
                                        className={fila.claseColorTotal}
                                        style={obtenerStyleStickyIzquierda(
                                            3,
                                            fila.rowBackgroundColor,
                                            {
                                                textAlign: 'center',
                                            },
                                        )}>
                                        <span
                                            draggable={
                                                RolProvider !== 'consultor'
                                            }
                                            onDragStart={(event) => {
                                                iniciarDragCantidad(event, {
                                                    mode: 'set',
                                                    value: fila.totalNecesario,
                                                    platoCodigo:
                                                        fila.platoCodigo,
                                                    platoPadreCodigo:
                                                        fila.platoPadreCodigo,
                                                });
                                            }}
                                            style={{
                                                cursor:
                                                    RolProvider === 'consultor'
                                                        ? 'default'
                                                        : 'grab',
                                                userSelect: 'none',
                                            }}
                                            title={
                                                RolProvider === 'consultor'
                                                    ? undefined
                                                    : 'Arrastrá para pegar este total en una celda de la misma fila'
                                            }>
                                            {fila.totalNecesario.toFixed(2)}
                                        </span>
                                    </td>
                                    {fila.cells.map((celda) => {
                                        const badgeDerecho = celda.badgeDerecho;

                                        return (
                                            <td
                                                style={styleCeldaDia}
                                                key={`${fila.rowKey}-${celda.fechaClave}`}>
                                                <div
                                                    className={
                                                        badgeDerecho
                                                            ? 'planificacion-celda-con-badge'
                                                            : undefined
                                                    }>
                                                    <Form.Control
                                                        type="number"
                                                        disabled={
                                                            RolProvider ===
                                                            'consultor'
                                                        }
                                                        style={{
                                                            width: '100%',
                                                            color:
                                                                celda.updateCant
                                                                    ? '#ff0000'
                                                                    : undefined,
                                                            cursor:
                                                                celda.placeholderArrastrable
                                                                    ? 'grab'
                                                                    : 'text',
                                                        }}
                                                        className="form-control form-control-sm input"
                                                        value={celda.valorInput}
                                                        placeholder={
                                                            !badgeDerecho &&
                                                            celda.totalConsumo
                                                                ? celda.totalConsumo.toString()
                                                                : ''
                                                        }
                                                        step={0.1}
                                                        min={0}
                                                        draggable={
                                                            celda.placeholderArrastrable
                                                        }
                                                        onDragStart={(
                                                            event,
                                                        ) => {
                                                            if (
                                                                !celda.placeholderArrastrable
                                                            ) {
                                                                return;
                                                            }

                                                            iniciarDragCantidad(
                                                                event,
                                                                {
                                                                    mode: 'add',
                                                                    value: celda.totalConsumo,
                                                                    platoCodigo:
                                                                        fila.platoCodigo,
                                                                    platoPadreCodigo:
                                                                        fila.platoPadreCodigo,
                                                                },
                                                            );
                                                        }}
                                                        onDragOver={(
                                                            event,
                                                        ) => {
                                                            handleDragOverInputCantidad(
                                                                event,
                                                                {
                                                                    platoCodigo:
                                                                        fila.platoCodigo,
                                                                    platoPadreCodigo:
                                                                        fila.platoPadreCodigo,
                                                                },
                                                            );
                                                        }}
                                                        onDrop={(event) => {
                                                            handleDropInputCantidad(
                                                                event,
                                                                {
                                                                    plato: fila.plato,
                                                                    platoCodigo:
                                                                        fila.platoCodigo,
                                                                    platoPadre:
                                                                        fila.platoPadre,
                                                                    platoPadreCodigo:
                                                                        fila.platoPadreCodigo,
                                                                    fecha: celda.fechaClave,
                                                                    cantidadActual:
                                                                        celda.valorInput,
                                                                },
                                                            );
                                                        }}
                                                        title={
                                                            celda.placeholderArrastrable
                                                                ? 'Arrastrá este valor para sumarlo en otra celda de la misma fila'
                                                                : undefined
                                                        }
                                                        onChange={(e) => {
                                                            actualizarProduccionCelda(
                                                                fila.plato,
                                                                fila.platoCodigo,
                                                                fila.platoPadre,
                                                                fila.platoPadreCodigo,
                                                                celda.fechaClave,
                                                                e.target.value,
                                                            );
                                                        }}
                                                    />
                                                    {badgeDerecho && (
                                                        <span
                                                            draggable={
                                                                badgeDerecho.draggable ===
                                                                true
                                                            }
                                                            className={`${badgeDerecho.className}${
                                                                badgeDerecho.draggable
                                                                    ? ' planificacion-badge-arrastrable'
                                                                    : ''
                                                            }`}
                                                            onDragStart={(
                                                                event,
                                                            ) => {
                                                                const dragValue =
                                                                    badgeDerecho.value;

                                                                if (
                                                                    badgeDerecho.draggable !==
                                                                        true ||
                                                                    dragValue ===
                                                                        undefined ||
                                                                    !Number.isFinite(
                                                                        dragValue,
                                                                    )
                                                                ) {
                                                                    return;
                                                                }

                                                                iniciarDragCantidad(
                                                                    event,
                                                                    {
                                                                        mode: 'add',
                                                                        value: dragValue,
                                                                        platoCodigo:
                                                                            fila.platoCodigo,
                                                                        platoPadreCodigo:
                                                                            fila.platoPadreCodigo,
                                                                    },
                                                                );
                                                            }}
                                                            title={
                                                                badgeDerecho.draggable
                                                                    ? 'Arrastrá este valor para sumarlo en otra celda de la misma fila'
                                                                    : badgeDerecho.title
                                                            }>
                                                            {badgeDerecho.texto}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                                {platoExpandido === fila.plato && (
                                    <PlatoDetalle
                                        plato={fila.plato}
                                        platoCodigo={fila.platoCodigo}
                                        diasSemanaProp={diasSemana}
                                        columnCount={
                                            totalColumnasPlanificacion
                                        }
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </Table>
            </div>
        </>
    );
}
