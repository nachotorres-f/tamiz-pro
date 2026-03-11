/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useContext, useEffect, useRef, useState } from 'react';
import {
    Button,
    Form,
    OverlayTrigger,
    Table,
    Tooltip,
} from 'react-bootstrap';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlatoDetalle } from './platoDetalle';
import { ChatRightText } from 'react-bootstrap-icons';
import { EventoPlanificacion } from '@/app/planificacion/page';
import { RolContext } from './filtroPlatos';
import { ObservacionModal } from './tablaPlanificacion/ObservacionModal';
import { AdelantarEventoModal } from './tablaPlanificacion/AdelantarEventoModal';

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
    produccion: any[];
    produccionUpdate: any[];
    observaciones: {
        plato: string;
        platoCodigo: string;
        observacion: string;
        platoPadre: string;
        platoPadreCodigo: string;
    }[];
    eventos: EventoPlanificacion[];
    maxCantidadEventosDia: number;
    setObservaciones: (
        value: {
            plato: string;
            platoCodigo: string;
            observacion: string;
            platoPadre: string;
            platoPadreCodigo: string;
        }[],
    ) => void;
    setProduccion: (value: any[]) => void;
    setProduccionUpdate: (value: any[]) => void;
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
    const solicitudesAdelantoPendientesRef = useRef<Promise<boolean>[]>([]);
    const timerRefrescoPlanificacionRef = useRef<number | null>(null);
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

    const filterPlatos = ({ plato }: { plato: string }) => {
        if (pageOcultos) {
            if (ocultos.has(plato)) {
                return true;
            }
            return false;
        }

        // Si el plato está oculto y no es la página de ocultos, no lo mostramos
        if (ocultos.has(plato)) return false;

        if (!filtro) return true;

        return plato.toLowerCase().includes(filtro.toLowerCase());
    };

    const abreviar = (lugar: string) => {
        if (lugar === 'El Central') return 'CEN';
        if (lugar === 'La Rural') return 'RUR';
        if (lugar === 'Rüt Haus') return 'RUT';
        if (lugar === 'Origami') return 'ORI';
    };

    const filterDias = (dia: Date) => {
        if (diaActivo && format(dia, 'yyyy-MM-dd') !== diaActivo) {
            return false;
        }
        return true;
    };

    const formatFecha = (dia: Date) => {
        const nombreDia = format(dia, 'EEEE', { locale: es }); // "lunes"
        const letraDia = nombreDia.startsWith('mi')
            ? 'X'
            : nombreDia.charAt(0).toUpperCase(); // "L"
        const diaNumero = format(dia, 'd'); // "5"
        const mesNumero = format(dia, 'M'); // "8"
        return `${letraDia} ${diaNumero}-${mesNumero}`;
    };
    const handleClose = () => setShow(false);

    const handleVerticalScrollLeft = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        const rigthTable = document.getElementById(
            'right-table',
        ) as HTMLElement;
        if (rigthTable) {
            rigthTable.scrollTop = scrollTop;
        }
    };

    const handleVerticalScrollRight = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;

        const leftTable = document.getElementById('left-table') as HTMLElement;

        // if (!isSyncingScroll) {
        //     isSyncingScroll = true;

        //     if (fakeScroll) {
        //         fakeScroll.scrollLeft = scrollLeft;
        //     }

        //     requestAnimationFrame(() => {
        //         isSyncingScroll = false;
        //     });
        // }

        if (leftTable) {
            leftTable.scrollTop = scrollTop;
        }
    };

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
            const valorEliminado = {
                plato,
                platoCodigo,
                platoPadre,
                platoPadreCodigo,
                fecha,
                cantidad: null,
                eliminar: true,
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

        const valorActualizado = {
            plato,
            platoCodigo,
            platoPadre,
            platoPadreCodigo,
            fecha,
            cantidad: Number(cantidad.toFixed(2)),
            eliminar: false,
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

                if (
                    (mode === 'set' || mode === 'add') &&
                    Number.isFinite(value)
                ) {
                    return { mode, value };
                }
            } catch {}
        }

        const dataTexto = dataTransfer.getData('text/plain');
        const value = Number.parseFloat(dataTexto.replace(',', '.'));

        if (!Number.isFinite(value)) {
            return null;
        }

        return {
            mode: 'set',
            value,
        };
    };

    const handleDragOverInputCantidad = (
        event: React.DragEvent<HTMLElement>,
    ) => {
        if (RolProvider === 'consultor') {
            return;
        }

        const tipos = Array.from(event.dataTransfer.types || []);
        const esDragCompatible =
            tipos.includes(DRAG_CANTIDAD_MIME) || tipos.includes('text/plain');

        if (!esDragCompatible) {
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

    const todosAdelantados =
        platosAdelantados.length > 0 &&
        platosAdelantados.every((plato) => !!plato.fecha);

    const heightTd = '3rem';
    const styleTd = {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        verticalAlign: 'middle',
        height: heightTd,
        left: 0,
        width: '2rem',
        maxWidth: '15rem',
    };
    const styleEventos = {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        verticalAlign: 'middle',
        height: '3rem',
        width: '12rem',
    };

    return (
        <>
            <ObservacionModal
                show={show}
                plato={platoModal}
                platoCodigo={platoCodigoModal}
                platoPadre={platoPadreModal}
                platoPadreCodigo={platoPadreCodigoModal}
                observacionModal={observacionModal}
                observaciones={observaciones}
                esConsultor={RolProvider === 'consultor'}
                onClose={handleClose}
                setObservacionModal={setObservacionModal}
                setObservaciones={setObservaciones}
            />

            <AdelantarEventoModal
                show={adelantarEvento != 0}
                cargando={cargandoPlatosAdelantados}
                platos={platosAdelantados}
                adelantandoTodo={adelantandoTodo}
                accionMasivaAdelanto={accionMasivaAdelanto}
                platosGuardandoAdelantoSize={platosGuardandoAdelanto.size}
                cerrando={cerrandoModalAdelanto}
                todosAdelantados={todosAdelantados}
                onClose={() => {
                    void handleCloseAdelantar();
                }}
                onToggleTodo={() => {
                    void handleToggleAdelantoTodo();
                }}
                onTogglePlato={(plato, checked) => {
                    const solicitud = actualizarAdelantoPlato(
                        plato.id,
                        checked,
                        plato.fecha,
                    );
                    registrarSolicitudAdelanto(solicitud);
                    void solicitud.then((actualizado) => {
                        if (actualizado) {
                            dispararActualizacionPlanificacion();
                        }
                    });
                }}
            />

            <div
                style={{
                    display: 'flex',
                    maxHeight: '90vh',
                }}>
                <div
                    id="left-table"
                    className="no-scrollbar"
                    style={{
                        flexShrink: 0,
                        // borderCollapse: 'collapse',
                        overflow: 'auto',
                        position: 'sticky',
                        left: 0,
                        zIndex: 3,
                    }}
                    onScroll={handleVerticalScrollLeft}>
                    <Table
                        style={{
                            width: 'max-content',
                            borderCollapse: 'collapse',
                        }}
                        className="mx-auto"
                        size="sm"
                        striped>
                        <thead className="sticky-top">
                            {Array.from({ length: maxCantidadEventosDia }).map(
                                (_, index) => (
                                    <tr
                                        key={`spacer-${index}`}
                                        style={{
                                            ...styleEventos,
                                            border: 'none',
                                        }}>
                                        {Array.from({ length: 4 }).map(
                                            (_, i) => (
                                                <td
                                                    key={i}
                                                    style={{
                                                        ...styleTd,
                                                        border: 'none',
                                                    }}>
                                                    &nbsp;
                                                </td>
                                            ),
                                        )}
                                    </tr>
                                ),
                            )}
                            <tr
                                style={{
                                    textAlign: 'center',
                                    width: 'max-content',
                                    backgroundColor: '#BDBDBD',
                                }}>
                                <th
                                    style={{
                                        position: 'sticky',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        verticalAlign: 'middle',
                                        height: '100%',
                                        width: 'max-content',
                                        top: 0,
                                        zIndex: 4,
                                        backgroundColor: '#BDBDBD',
                                    }}></th>
                                <th
                                    style={{
                                        position: 'sticky',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        verticalAlign: 'middle',
                                        height: '100%',
                                        top: 0,
                                        zIndex: 4,
                                        backgroundColor: '#BDBDBD',
                                    }}>
                                    Plato
                                </th>
                                <th
                                    style={{
                                        position: 'sticky',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        verticalAlign: 'middle',
                                        height: '100%',
                                        top: 0,
                                        zIndex: 4,
                                        backgroundColor: '#BDBDBD',
                                    }}>
                                    Elaboracion
                                </th>
                                <th
                                    style={{
                                        position: 'sticky',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        verticalAlign: 'middle',
                                        height: '100%',
                                        top: 0,
                                        zIndex: 4,
                                        backgroundColor: '#BDBDBD',
                                    }}>
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {platosUnicos
                                .filter(filterPlatos)
                                .map(
                                    ({
                                        plato,
                                        platoCodigo,
                                        platoPadre,
                                        platoPadreCodigo,
                                    }) => (
                                        <React.Fragment
                                            key={
                                                platoCodigo +
                                                platoPadreCodigo
                                            }>
                                        <tr style={{ textAlign: 'center' }}>
                                            <td style={styleTd}>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    style={{
                                                        width: '2rem',
                                                        height: '2.2rem',
                                                        display: 'flex',
                                                        justifyContent:
                                                            'center',
                                                        alignItems: 'center',
                                                    }}
                                                    onClick={() => {
                                                        const observacion =
                                                            observaciones.find(
                                                                (o) =>
                                                                    o.platoCodigo ===
                                                                        platoCodigo &&
                                                                    o.platoPadreCodigo ===
                                                                        platoPadreCodigo,
                                                            )?.observacion ||
                                                            observacionModal;

                                                        if (observacion) {
                                                            setObservacionModal(
                                                                observacion,
                                                            );
                                                        } else {
                                                            const prod =
                                                                produccion.filter(
                                                                    (p) =>
                                                                        p.platoCodigo ===
                                                                            platoCodigo &&
                                                                        p.platoPadreCodigo ===
                                                                            platoPadreCodigo &&
                                                                        p.observacion,
                                                                );

                                                            if (
                                                                prod.length > 0
                                                            ) {
                                                                setObservacionModal(
                                                                    prod[0]
                                                                        .observacion,
                                                                );
                                                            } else {
                                                                setObservacionModal(
                                                                    '',
                                                                );
                                                            }
                                                        }

                                                        setPlatoModal(plato);
                                                        setPlatoCodigoModal(
                                                            platoCodigo,
                                                        );
                                                        setPlatoPadreModal(
                                                            platoPadre,
                                                        );
                                                        setPlatoPadreCodigoModal(
                                                            platoPadreCodigo,
                                                        );
                                                        setShow(true);
                                                    }}>
                                                    <ChatRightText />
                                                </Button>
                                            </td>
                                            <td style={styleTd}>
                                                <OverlayTrigger
                                                    overlay={
                                                        <Tooltip
                                                            id={
                                                                plato +
                                                                platoPadre
                                                            }>
                                                            {platoPadre}
                                                        </Tooltip>
                                                    }>
                                                    <span>{platoPadre}</span>
                                                </OverlayTrigger>
                                            </td>
                                            <td style={styleTd}>
                                                <OverlayTrigger
                                                    overlay={
                                                        <Tooltip
                                                            id={
                                                                platoPadre +
                                                                plato
                                                            }>
                                                            {plato}
                                                        </Tooltip>
                                                    }>
                                                    <span>{plato}</span>
                                                </OverlayTrigger>
                                            </td>
                                            <td
                                                className={
                                                    datos
                                                        .filter(
                                                            (dato) =>
                                                                dato.platoCodigo ===
                                                                    platoCodigo &&
                                                                dato.platoPadreCodigo ===
                                                                    platoPadreCodigo,
                                                        )
                                                        .reduce(
                                                            (sum, d) =>
                                                                sum +
                                                                d.cantidad,
                                                            0,
                                                        ) >
                                                    produccion
                                                        .filter(
                                                            (d) =>
                                                                d.platoCodigo ===
                                                                    platoCodigo &&
                                                                d.platoPadreCodigo ===
                                                                    platoPadreCodigo,
                                                        )
                                                        .reduce(
                                                            (sum, d) =>
                                                                sum +
                                                                d.cantidad,
                                                            0,
                                                        )
                                                        ? 'text-danger'
                                                        : ''
                                                }
                                                style={styleTd}>
                                                {(() => {
                                                    const totalFila = datos
                                                        .filter(
                                                            (dato) =>
                                                                dato.platoCodigo ===
                                                                    platoCodigo &&
                                                                dato.platoPadreCodigo ===
                                                                    platoPadreCodigo,
                                                        )
                                                        .reduce(
                                                            (sum, d) =>
                                                                sum +
                                                                d.cantidad,
                                                            0,
                                                        );

                                                    return (
                                                        <span
                                                            draggable={
                                                                RolProvider !==
                                                                'consultor'
                                                            }
                                                            onDragStart={(
                                                                event,
                                                            ) => {
                                                                iniciarDragCantidad(
                                                                    event,
                                                                    {
                                                                        mode: 'set',
                                                                        value: totalFila,
                                                                    },
                                                                );
                                                            }}
                                                            style={{
                                                                cursor:
                                                                    RolProvider ===
                                                                    'consultor'
                                                                        ? 'default'
                                                                        : 'grab',
                                                                userSelect:
                                                                    'none',
                                                            }}
                                                            title={
                                                                RolProvider ===
                                                                'consultor'
                                                                    ? undefined
                                                                    : 'Arrastrá para pegar este total en una celda'
                                                            }>
                                                            {totalFila.toFixed(
                                                                2,
                                                            )}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                    ),
                                )}
                        </tbody>
                    </Table>
                </div>
                <div
                    id="right-table"
                    className="no-scrollbar"
                    style={{
                        overflow: 'auto',
                        flexGrow: 1,
                    }}
                    onScroll={handleVerticalScrollRight}>
                    <Table
                        style={{
                            width: '100%',
                        }}
                        className="mx-auto"
                        size="sm"
                        striped>
                        <thead className="sticky-top">
                            {Array.from({ length: maxCantidadEventosDia }).map(
                                (_, index) => (
                                    <tr
                                        key={`spacer-${index}`}
                                        style={{
                                            height: heightTd,
                                            width: 'max-content',
                                            border: 'none',
                                        }}>
                                        {diasSemana.map((dia, i) => {
                                            const diaLimpio = new Date(dia);
                                            diaLimpio.setHours(0, 0, 0, 0);
                                            const eventosDia = eventos.filter(
                                                (d) => {
                                                    const fecha = new Date(
                                                        d.fecha,
                                                    );
                                                    fecha.setHours(0, 0, 0, 0);
                                                    return (
                                                        fecha.getTime() ===
                                                        diaLimpio.getTime()
                                                    );
                                                },
                                            );
                                            const offset =
                                                maxCantidadEventosDia -
                                                eventosDia.length;
                                            const eventoIndex = index - offset;
                                            if (eventoIndex >= 0) {
                                                const evento =
                                                    eventosDia[eventoIndex];
                                                return (
                                                    <td
                                                        className="link-pdf"
                                                        onClick={() => {
                                                            if (
                                                                RolProvider ===
                                                                'consultor'
                                                            )
                                                                return;
                                                            setAdelantarEvento(
                                                                evento.id,
                                                            );
                                                        }}
                                                        key={i + index}
                                                        style={{
                                                            ...styleEventos,
                                                            verticalAlign:
                                                                'middle',
                                                            border: 'none',
                                                        }}>
                                                        {abreviar(evento.lugar)}
                                                        {' - '}
                                                        {evento.salon}
                                                    </td>
                                                );
                                            } else {
                                                return (
                                                    <td
                                                        key={i + index}
                                                        style={{
                                                            ...styleEventos,
                                                            verticalAlign:
                                                                'middle',
                                                            border: 'none',
                                                        }}>
                                                        &nbsp;
                                                    </td>
                                                );
                                            }
                                        })}
                                    </tr>
                                ),
                            )}
                            <tr style={{ textAlign: 'center' }}>
                                {diasSemana
                                    .filter(filterDias)
                                    .map((dia, idx) => (
                                        <th
                                            key={idx}
                                            style={{
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 2,
                                                minWidth: '15rem',
                                                backgroundColor:
                                                    idx < 11
                                                        ? 'rgb(255, 255, 0)'
                                                        : '#BDBDBD',
                                            }}>
                                            {formatFecha(dia)}
                                        </th>
                                    ))}
                            </tr>
                        </thead>
                        <tbody>
                            {platosUnicos
                                .filter(filterPlatos)
                                .map(
                                    ({
                                        plato,
                                        platoCodigo,
                                        platoPadre,
                                        platoPadreCodigo,
                                    }) => (
                                        <React.Fragment
                                            key={
                                                platoCodigo +
                                                platoPadreCodigo
                                            }>
                                        <tr style={{ textAlign: 'center' }}>
                                            {diasSemana
                                                .filter(filterDias)
                                                .map((dia, i) => {
                                                    const diaLimpio = new Date(
                                                        dia,
                                                    );
                                                    diaLimpio.setHours(
                                                        0,
                                                        0,
                                                        0,
                                                        0,
                                                    );

                                                    const total =
                                                        produccion.filter(
                                                            (d) => {
                                                                const fecha =
                                                                    new Date(
                                                                        d.fecha,
                                                                    );
                                                                fecha.setHours(
                                                                    0,
                                                                    0,
                                                                    0,
                                                                    0,
                                                                );
                                                                fecha.setDate(
                                                                    fecha.getDate() +
                                                                        1,
                                                                ); // Ajuste para comparar con el día limpio

                                                                return (
                                                                    d.platoCodigo ===
                                                                        platoCodigo &&
                                                                    d.platoPadreCodigo ===
                                                                        platoPadreCodigo &&
                                                                    fecha.getTime() ===
                                                                        diaLimpio.getTime()
                                                                );
                                                            },
                                                        );

                                                    const update =
                                                        produccionUpdate.filter(
                                                            (d) => {
                                                                const fecha =
                                                                    new Date(
                                                                        d.fecha,
                                                                    );
                                                                fecha.setHours(
                                                                    0,
                                                                    0,
                                                                    0,
                                                                    0,
                                                                );
                                                                fecha.setDate(
                                                                    fecha.getDate() +
                                                                        1,
                                                                ); // Ajuste para comparar con el día limpio

                                                                return (
                                                                    d.platoCodigo ===
                                                                        platoCodigo &&
                                                                    d.platoPadreCodigo ===
                                                                        platoPadreCodigo &&
                                                                    fecha.getTime() ===
                                                                        diaLimpio.getTime()
                                                                );
                                                            },
                                                        );

                                                    const totalConsumo = datos
                                                        .filter((d) => {
                                                            const fecha =
                                                                new Date(
                                                                    d.fecha,
                                                                );
                                                            fecha.setHours(
                                                                0,
                                                                0,
                                                                0,
                                                                0,
                                                            );

                                                            return (
                                                                d.platoCodigo ===
                                                                    platoCodigo &&
                                                                d.platoPadreCodigo ===
                                                                    platoPadreCodigo &&
                                                                fecha.getTime() ===
                                                                    dia.getTime()
                                                            );
                                                        })
                                                        .reduce(
                                                            (sum, d) =>
                                                                sum +
                                                                d.cantidad,
                                                            0,
                                                        );

                                                    let cantidad = '';

                                                    if (total.length > 0) {
                                                        cantidad = total.reduce(
                                                            (sum, d) =>
                                                                sum +
                                                                d.cantidad,
                                                            0,
                                                        );
                                                    }

                                                    let updateCant = false;

                                                    if (update.length > 0) {
                                                        updateCant = true;
                                                        const tieneEliminacion =
                                                            update.some(
                                                                (d) =>
                                                                    d?.eliminar ===
                                                                        true ||
                                                                    d?.cantidad ===
                                                                        null ||
                                                                    d?.cantidad ===
                                                                        '',
                                                            );

                                                        if (tieneEliminacion) {
                                                            cantidad = '';
                                                        } else {
                                                            cantidad =
                                                                update.reduce(
                                                                    (sum, d) =>
                                                                        sum +
                                                                        Number(
                                                                            d.cantidad,
                                                                        ),
                                                                    0,
                                                            );
                                                        }
                                                    }

                                                    const fechaCelda = format(
                                                        diaLimpio,
                                                        'yyyy-MM-dd',
                                                    );
                                                    const placeholderArrastrable =
                                                        RolProvider !==
                                                            'consultor' &&
                                                        cantidad === '' &&
                                                        totalConsumo > 0;

                                                    return (
                                                        <td
                                                            style={{
                                                                height: heightTd,
                                                                verticalAlign:
                                                                    'middle',
                                                            }}
                                                            key={
                                                                platoCodigo +
                                                                platoPadreCodigo +
                                                                i
                                                            }>
                                                            <Form.Control
                                                                type="number"
                                                                disabled={
                                                                    RolProvider ===
                                                                    'consultor'
                                                                }
                                                                style={{
                                                                    width: '100%',
                                                                    color: updateCant
                                                                        ? '#ff0000'
                                                                        : '#000000',
                                                                    cursor: placeholderArrastrable
                                                                        ? 'grab'
                                                                        : 'text',
                                                                }}
                                                                className="form-control form-control-sm input"
                                                                value={cantidad}
                                                                placeholder={
                                                                    totalConsumo
                                                                        ? totalConsumo.toString()
                                                                        : ''
                                                                }
                                                                step={0.1}
                                                                min={0}
                                                                draggable={
                                                                    placeholderArrastrable
                                                                }
                                                                onDragStart={(
                                                                    event,
                                                                ) => {
                                                                    if (
                                                                        !placeholderArrastrable
                                                                    ) {
                                                                        return;
                                                                    }
                                                                    iniciarDragCantidad(
                                                                        event,
                                                                        {
                                                                            mode: 'add',
                                                                            value: totalConsumo,
                                                                        },
                                                                    );
                                                                }}
                                                                onDragOver={
                                                                    handleDragOverInputCantidad
                                                                }
                                                                onDrop={(
                                                                    event,
                                                                ) => {
                                                                    handleDropInputCantidad(
                                                                        event,
                                                                        {
                                                                            plato,
                                                                            platoCodigo,
                                                                            platoPadre,
                                                                            platoPadreCodigo,
                                                                            fecha: fechaCelda,
                                                                            cantidadActual:
                                                                                cantidad,
                                                                        },
                                                                    );
                                                                }}
                                                                title={
                                                                    placeholderArrastrable
                                                                        ? 'Arrastrá este valor para sumarlo en otra celda'
                                                                        : undefined
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    actualizarProduccionCelda(
                                                                        plato,
                                                                        platoCodigo,
                                                                        platoPadre,
                                                                        platoPadreCodigo,
                                                                        fechaCelda,
                                                                        e.target
                                                                            .value,
                                                                    );
                                                                }}
                                                            />
                                                        </td>
                                                    );
                                                })}
                                        </tr>
                                        {platoExpandido === plato && (
                                            <PlatoDetalle
                                                plato={plato}
                                                platoCodigo={platoCodigo}
                                                diasSemanaProp={diasSemana}
                                            />
                                        )}
                                    </React.Fragment>
                                    ),
                                )}
                        </tbody>
                    </Table>
                </div>
            </div>

            {/* <div
                style={{
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    height: '14px',
                }}
                onScroll={handleFakeScroll}
                id="fake-scroll">
                <div style={{ width: '15000px', height: '1px' }}></div>
            </div> */}
        </>
    );
}
