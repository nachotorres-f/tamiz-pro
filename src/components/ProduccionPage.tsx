/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { NavegacionSemanal } from '@/components/navegacionSemanal';
import { formatearDiaTabla } from '@/lib/formatearDiaTabla';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import React, {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { CellObject, CellStyle, WorkSheet } from 'xlsx-js-style';
import {
    Accordion,
    Button,
    Col,
    Container,
    Dropdown,
    FloatingLabel,
    Form,
    Modal,
    OverlayTrigger,
    Row,
    Table,
    Tooltip,
} from 'react-bootstrap';
import {
    ArrowReturnLeft,
    ArrowReturnRight,
    ChatSquareTextFill,
    EyeFill,
    FiletypePdf,
    Fullscreen,
    FullscreenExit,
    Gear,
    Trash,
} from 'react-bootstrap-icons';
import { MoonLoader } from 'react-spinners';
import { RolContext, SalonContext } from '@/components/filtroPlatos';
import { Slide, toast, ToastContainer } from 'react-toastify';
import {
    generarPDFReceta,
    generarPDFRecetasSeleccionadas,
} from '@/lib/generarPDF';
import AgregarPlato from '@/components/agregarPlato';

interface ProduccionPageProps {
    entregaMP: boolean;
}

const estiloHeaderOscuro: CellStyle = {
    alignment: {
        horizontal: 'center',
        vertical: 'center',
    },
    fill: {
        patternType: 'solid',
        fgColor: {
            rgb: '404040',
        },
    },
    font: {
        bold: true,
        color: {
            rgb: 'FFFFFF',
        },
    },
};

const estiloFilaComentario: CellStyle = {
    fill: {
        patternType: 'solid',
        fgColor: {
            rgb: 'FFF3CD',
        },
    },
};

function TextoProduccionTruncado({
    texto,
    tooltipId,
}: {
    texto: string;
    tooltipId: string;
}) {
    const textoRef = useRef<HTMLSpanElement | null>(null);
    const [mostrarTooltip, setMostrarTooltip] = useState(false);

    useEffect(() => {
        const elemento = textoRef.current;

        if (!elemento) {
            return;
        }

        const actualizarOverflow = () => {
            setMostrarTooltip(elemento.scrollWidth > elemento.clientWidth + 1);
        };

        actualizarOverflow();

        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', actualizarOverflow);

            return () => {
                window.removeEventListener('resize', actualizarOverflow);
            };
        }

        const resizeObserver = new ResizeObserver(() => {
            actualizarOverflow();
        });

        resizeObserver.observe(elemento);

        return () => {
            resizeObserver.disconnect();
        };
    }, [texto]);

    const contenido = (
        <span
            ref={textoRef}
            className="produccion-texto-truncado">
            {texto}
        </span>
    );

    if (!mostrarTooltip) {
        return contenido;
    }

    return (
        <OverlayTrigger
            placement="top"
            overlay={<Tooltip id={tooltipId}>{texto}</Tooltip>}>
            {contenido}
        </OverlayTrigger>
    );
}

export default function ProduccionPage({ entregaMP }: ProduccionPageProps) {
    const salon = useContext(SalonContext);
    const RolProvider = useContext(RolContext);
    const ref = useRef<HTMLDivElement>(null);

    const [diasSemana, setDiasSemana] = useState<Date[]>([]);
    const [diaActivo, setDiaActivo] = useState('');
    const [semanaBase, setSemanaBase] = useState(new Date());
    const [datosApi, setDatosApi] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fechaImprimir, setFechaImprimir] = useState<Date | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showModalGestion, setShowModalGestion] = useState(false);
    const [observacionModal, setObservacionModal] = useState('');
    const [filaGestionProduccion, setFilaGestionProduccion] =
        useState<any | null>(null);
    const [fechasSeleccionadas, setFechasSeleccionadas] = useState<string[]>(
        [],
    );
    const [gestionEnCurso, setGestionEnCurso] = useState(false);

    const modoId = entregaMP ? 'entrega-mp' : 'produccion';
    const tituloPagina = entregaMP ? 'Entrega de MP' : 'Produccion';
    const nombreArchivoExcel = entregaMP ? 'entregaMP.xlsx' : 'produccion.xlsx';
    const nombreHojaPrincipalExcel = entregaMP ? 'Entrega MP' : 'Produccion';

    const construirUrlConsulta = useCallback(
        (hastaUltimo = false) => {
            let url = '/api/produccion?fechaInicio=' + semanaBase.toISOString();

            if (entregaMP) {
                url += '&previa=true';
            }

            url += '&salon=' + salon;

            if (hastaUltimo) {
                url += '&hastaUltimo=true';
            }

            return url;
        },
        [entregaMP, salon, semanaBase],
    );

    const recargarDatos = useCallback(
        async ({ silencioso = false }: { silencioso?: boolean } = {}) => {
            if (!silencioso) {
                setLoading(true);
            }

            try {
                const res = await fetch(construirUrlConsulta());
                const payload = await res.json();
                const nuevosDatos = Array.isArray(payload?.data)
                    ? payload.data
                    : [];
                setDatosApi(nuevosDatos);
                return nuevosDatos;
            } finally {
                if (!silencioso) {
                    setLoading(false);
                }
            }
        },
        [construirUrlConsulta],
    );

    useEffect(() => {
        void recargarDatos();
    }, [recargarDatos]);

    useEffect(() => {
        const inicioSemana = semanaBase;
        const dias = Array.from({ length: 7 }, (_, i) =>
            addDays(inicioSemana, i),
        );
        setDiasSemana(dias);
        setDiaActivo('');
    }, [semanaBase]);

    const handleFullscreen = () => {
        if (ref.current && !isFullscreen) goFullscreen(ref.current);

        if (isFullscreen) {
            exitFullscreen();
            setIsFullscreen(false);
        }
    };

    function goFullscreen(element: HTMLElement) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
            setIsFullscreen(true);
        } else if ((element as any).webkitRequestFullscreen) {
            (element as any).webkitRequestFullscreen();
            setIsFullscreen(true);
        } else if ((element as any).msRequestFullscreen) {
            (element as any).msRequestFullscreen();
            setIsFullscreen(true);
        }
    }

    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
            (document as any).msExitFullscreen();
        }
    }

    const obtenerFechaPersistida = useCallback(
        (fecha: Date) => (entregaMP ? addDays(fecha, 1) : addDays(fecha, -1)),
        [entregaMP],
    );

    const obtenerFechaComentario = useCallback(
        (fecha: Date) => (entregaMP ? addDays(fecha, 2) : fecha),
        [entregaMP],
    );

    const obtenerFechaImpresion = useCallback(
        (fecha: Date) => (entregaMP ? addDays(fecha, 2) : fecha),
        [entregaMP],
    );

    const filterDias = useCallback(
        (dia: Date) => {
            if (
                diaActivo &&
                format(addDays(dia, -1), 'yyyy-MM-dd') === diaActivo
            ) {
                return true;
            }

            if (diaActivo && format(dia, 'yyyy-MM-dd') !== diaActivo) {
                return false;
            }

            return true;
        },
        [diaActivo],
    );

    const imprimirRecetas = async (
        listaPlatos: string[],
        fecha: Date,
        modo: 'unico' | 'separado',
        mensajeCarga: string,
        mensajeExito: string,
    ) => {
        const toastId = toast.loading(mensajeCarga, {
            position: 'bottom-right',
            type: 'info',
            theme: 'colored',
            transition: Slide,
        });

        try {
            await generarPDFReceta(listaPlatos, fecha, salon, modo, entregaMP);
            toast.update(toastId, {
                render: mensajeExito,
                type: 'success',
                isLoading: false,
                autoClose: 3000,
                closeOnClick: true,
                draggable: true,
            });
        } catch {
            toast.update(toastId, {
                render: 'Error al imprimir recetas',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
                closeOnClick: true,
                draggable: true,
            });
        }
    };

    const generarPDF = async (modo: 'unico' | 'separado') => {
        handleClose();
        await imprimirRecetas(
            [],
            fechaImprimir || new Date(),
            modo,
            'Imprimiendo recetas',
            'Recetas impresas',
        );
    };

    const handleClose = () => setShowModal(false);
    const handleCloseModalGestion = () => {
        setShowModalGestion(false);
        setFilaGestionProduccion(null);
        setFechasSeleccionadas([]);
        setObservacionModal('');
    };

    const filterPlatosPorDia = useCallback(
        (dato: any) => {
            if (!diaActivo) {
                return true;
            }

            const dia = addDays(new Date(diaActivo), 1);
            const diaSiguiente = addDays(dia, 1);

            dia.setHours(0, 0, 0, 0);
            diaSiguiente.setHours(0, 0, 0, 0);

            const produccion = dato.produccion.find((prod: any) => {
                const fecha = new Date(prod.fecha);
                fecha.setHours(0, 0, 0, 0);

                return (
                    fecha.getTime() === dia.getTime() ||
                    fecha.getTime() === diaSiguiente.getTime()
                );
            });

            return produccion?.cantidad > 0;
        },
        [diaActivo],
    );

    const obtenerProduccionPorDia = (dato: any, dia: Date) => {
        const diaNormalizado = new Date(dia);
        diaNormalizado.setHours(0, 0, 0, 0);

        return dato.produccion.find((prod: any) => {
            const fecha = new Date(prod.fecha);
            fecha.setHours(0, 0, 0, 0);

            return fecha.getTime() === diaNormalizado.getTime();
        });
    };

    const obtenerCantidadPorDia = (dato: any, dia: Date) => {
        const produccion = obtenerProduccionPorDia(dato, dia);
        return produccion ? produccion.cantidad : '';
    };

    const produccionesSeleccionadas = useMemo(() => {
        if (!filaGestionProduccion || fechasSeleccionadas.length === 0) {
            return [];
        }

        const fechasSet = new Set(fechasSeleccionadas);

        return (filaGestionProduccion.produccion || [])
            .filter((prod: any) => fechasSet.has(prod.fecha))
            .sort(
                (a: any, b: any) =>
                    new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
            );
    }, [fechasSeleccionadas, filaGestionProduccion]);

    const abrirModalGestion = useCallback(
        (dato: any, fechasIniciales: string[] = []) => {
            setFilaGestionProduccion(dato);
            setFechasSeleccionadas(fechasIniciales);

            const comentarioInicial =
                fechasIniciales.length === 1
                    ? (dato.produccion || []).find(
                          (prod: any) => prod.fecha === fechasIniciales[0],
                      )?.comentario || dato.comentario || ''
                    : dato.comentario || '';

            setObservacionModal(
                typeof comentarioInicial === 'string'
                    ? comentarioInicial.trim()
                    : '',
            );
            setShowModalGestion(true);
        },
        [],
    );

    const alternarFechaSeleccionada = useCallback((fecha: string) => {
        setFechasSeleccionadas((prev) =>
            prev.includes(fecha)
                ? prev.filter((item) => item !== fecha)
                : [...prev, fecha],
        );
    }, []);

    const validarSeleccionGestion = useCallback(() => {
        if (!filaGestionProduccion?.platoCodigo || !salon) {
            toast.error('No hay una fila de producción seleccionada', {
                position: 'bottom-right',
                theme: 'colored',
                transition: Slide,
            });
            return false;
        }

        if (produccionesSeleccionadas.length === 0) {
            toast.error('Selecciona al menos una fecha de producción', {
                position: 'bottom-right',
                theme: 'colored',
                transition: Slide,
            });
            return false;
        }

        return true;
    }, [filaGestionProduccion, produccionesSeleccionadas.length, salon]);

    const esperarActualizacionVisual = useCallback(
        () =>
            new Promise<void>((resolve) => {
                window.requestAnimationFrame(() => {
                    window.setTimeout(resolve, 0);
                });
            }),
        [],
    );

    const refrescarYcerrarModalGestion = useCallback(
        async (silencioso = false) => {
            handleCloseModalGestion();
            await recargarDatos({ silencioso });
        },
        [recargarDatos],
    );

    const guardarComentariosSeleccionados = async () => {
        if (!validarSeleccionGestion()) {
            return;
        }

        setGestionEnCurso(true);
        const toastId = toast.loading('Guardando comentario', {
            position: 'bottom-right',
            type: 'info',
            theme: 'colored',
            transition: Slide,
        });

        try {
            await Promise.all(
                produccionesSeleccionadas.map(async (prod: any) => {
                    const res = await fetch('api/produccion/comentario', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            platoCodigo: filaGestionProduccion.platoCodigo,
                            platoPadreCodigo:
                                filaGestionProduccion.platoPadreCodigo,
                            cantidad: prod.cantidad,
                            fecha: obtenerFechaComentario(new Date(prod.fecha)),
                            comentario: observacionModal,
                            salon,
                        }),
                    });

                    if (!res.ok) {
                        throw new Error('Error al guardar comentario');
                    }
                }),
            );

            toast.update(toastId, {
                render: 'Comentario guardado',
                type: 'success',
                isLoading: false,
                autoClose: 3000,
                closeOnClick: true,
                draggable: true,
            });
            await refrescarYcerrarModalGestion();
        } catch {
            toast.update(toastId, {
                render: 'Error al guardar el comentario',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
                closeOnClick: true,
                draggable: true,
            });
        } finally {
            setGestionEnCurso(false);
        }
    };

    const pasarProduccionesSeleccionadas = async (
        accion: 'adelantar' | 'atrasar',
    ) => {
        if (!validarSeleccionGestion()) {
            return;
        }

        setGestionEnCurso(true);
        const mensajeAccion =
            accion === 'adelantar'
                ? 'Adelantando el plato'
                : 'Atrasando el plato';
        const mensajeExito =
            accion === 'adelantar' ? 'Plato adelantado' : 'Plato atrasado';
        const mensajeError =
            accion === 'adelantar'
                ? 'Error al adelantar el plato'
                : 'Error al atrasar el plato';

        const toastId = toast.loading(mensajeAccion, {
            position: 'bottom-right',
            type: 'info',
            theme: 'colored',
            transition: Slide,
        });

        try {
            await Promise.all(
                produccionesSeleccionadas.map(async (prod: any) => {
                    const res = await fetch('api/produccion/' + accion, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            platoCodigo: filaGestionProduccion.platoCodigo,
                            platoPadreCodigo:
                                filaGestionProduccion.platoPadreCodigo,
                            cantidad: prod.cantidad,
                            fecha: obtenerFechaPersistida(
                                new Date(prod.fecha),
                            ),
                            salon,
                        }),
                    });

                    if (!res.ok) {
                        throw new Error(`Error al ${accion} producción`);
                    }
                }),
            );

            const datosActualizados = await recargarDatos({ silencioso: true });
            const filaActualizada =
                datosActualizados.find(
                    (dato: any) =>
                        dato.platoCodigo === filaGestionProduccion.platoCodigo &&
                        (dato.platoPadreCodigo ?? '') ===
                            (filaGestionProduccion.platoPadreCodigo ?? ''),
                ) || null;

            if (!filaActualizada) {
                setFilaGestionProduccion((prev: any) =>
                    prev
                        ? {
                              ...prev,
                              produccion: [],
                          }
                        : prev,
                );
                setFechasSeleccionadas([]);
            } else {
                const desplazamiento = accion === 'adelantar' ? -1 : 1;
                const fechasDisponibles = new Set(
                    (filaActualizada.produccion || []).map(
                        (prod: any) => prod.fecha,
                    ),
                );
                const nuevasFechasSeleccionadas = fechasSeleccionadas
                    .map((fecha) =>
                        addDays(new Date(fecha), desplazamiento).toISOString(),
                    )
                    .filter((fecha) => fechasDisponibles.has(fecha));

                setFilaGestionProduccion(filaActualizada);
                setFechasSeleccionadas(nuevasFechasSeleccionadas);
            }

            await esperarActualizacionVisual();

            toast.update(toastId, {
                render: mensajeExito,
                type: 'success',
                isLoading: false,
                autoClose: 3000,
                closeOnClick: true,
                draggable: true,
            });
        } catch {
            toast.update(toastId, {
                render: mensajeError,
                type: 'error',
                isLoading: false,
                autoClose: 5000,
                closeOnClick: true,
                draggable: true,
            });
        } finally {
            setGestionEnCurso(false);
        }
    };

    const eliminarProduccionesSeleccionadas = async () => {
        if (!validarSeleccionGestion()) {
            return;
        }

        setGestionEnCurso(true);
        const toastId = toast.loading('Eliminando producción', {
            position: 'bottom-right',
            type: 'info',
            theme: 'colored',
            transition: Slide,
        });

        try {
            await Promise.all(
                produccionesSeleccionadas.map(async (prod: any) => {
                    const res = await fetch('/api/produccion', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            platoCodigo: filaGestionProduccion.platoCodigo,
                            platoPadreCodigo:
                                filaGestionProduccion.platoPadreCodigo,
                            fecha: obtenerFechaPersistida(
                                new Date(prod.fecha),
                            ),
                            salon,
                        }),
                    });

                    if (!res.ok) {
                        throw new Error('Error al eliminar producción');
                    }
                }),
            );

            toast.update(toastId, {
                render: 'Producción eliminada',
                type: 'success',
                isLoading: false,
                autoClose: 3000,
                closeOnClick: true,
                draggable: true,
            });
            await refrescarYcerrarModalGestion();
        } catch {
            toast.update(toastId, {
                render: 'Error al eliminar la producción',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
                closeOnClick: true,
                draggable: true,
            });
        } finally {
            setGestionEnCurso(false);
        }
    };

    const imprimirProduccionesSeleccionadas = async (
        modo: 'unico' | 'separado',
    ) => {
        if (!validarSeleccionGestion()) {
            return;
        }

        setGestionEnCurso(true);
        const toastId = toast.loading('Imprimiendo recetas', {
            position: 'bottom-right',
            type: 'info',
            theme: 'colored',
            transition: Slide,
        });

        try {
            await generarPDFRecetasSeleccionadas(
                produccionesSeleccionadas.map((prod: any) => ({
                    fecha: obtenerFechaImpresion(new Date(prod.fecha)),
                    listaPlatos: [filaGestionProduccion.platoCodigo],
                })),
                salon,
                modo,
                entregaMP,
                filaGestionProduccion.plato,
            );

            toast.update(toastId, {
                render: 'Recetas impresas',
                type: 'success',
                isLoading: false,
                autoClose: 3000,
                closeOnClick: true,
                draggable: true,
            });
            handleCloseModalGestion();
        } catch {
            toast.update(toastId, {
                render: 'Error al imprimir recetas',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
                closeOnClick: true,
                draggable: true,
            });
        } finally {
            setGestionEnCurso(false);
        }
    };

    const diasVisibles = useMemo(
        () => diasSemana.filter(filterDias),
        [diasSemana, filterDias],
    );
    const datosVisibles = useMemo(
        () =>
            datosApi ? datosApi.filter((dato) => filterPlatosPorDia(dato)) : [],
        [datosApi, filterPlatosPorDia],
    );
    const diasHeaderVisibles = useMemo(
        () =>
            diasVisibles.map((dia) => ({
                clave: format(dia, 'yyyy-MM-dd'),
                dia,
                etiqueta: formatearDiaTabla(dia),
                mostrarAcciones: datosVisibles.some((dato) => {
                    const produccion = obtenerProduccionPorDia(dato, dia);
                    return Number(produccion?.cantidad ?? 0) > 0;
                }),
            })),
        [datosVisibles, diasVisibles],
    );

    if (loading) {
        return (
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                }}>
                <MoonLoader
                    color="#fff"
                    size={100}
                    speedMultiplier={0.5}
                />
            </div>
        );
    }

    const calcularAnchoColumna = (
        filas: Array<Array<string | number>>,
        indiceColumna: number,
        padding = 2,
    ) => {
        const maximoCaracteres = filas.reduce((maximo, fila) => {
            const valor = fila[indiceColumna] ?? '';
            return Math.max(maximo, String(valor).length);
        }, 0);

        return maximoCaracteres + padding;
    };

    const obtenerAnchosColumnasPrincipales = (datos: any[]) => {
        const filasParaAncho: Array<Array<string | number>> = [
            ['Plato', 'Elaboracion'],
            ...datos.map((dato) => [dato.platoPadre || '', dato.plato || '']),
        ];

        return [
            { wch: calcularAnchoColumna(filasParaAncho, 0, 0.7) },
            { wch: calcularAnchoColumna(filasParaAncho, 1, 0.7) },
        ];
    };

    const aplicarEstiloHeader = (
        worksheet: WorkSheet,
        XLSX: typeof import('xlsx-js-style'),
    ) => {
        const rango = worksheet['!ref']
            ? XLSX.utils.decode_range(worksheet['!ref'])
            : null;

        if (!rango) {
            return;
        }

        for (let c = 0; c <= rango.e.c; c += 1) {
            const direccionHeader = XLSX.utils.encode_cell({
                r: 0,
                c,
            });
            const headerCelda = worksheet[direccionHeader] as
                | CellObject
                | undefined;

            if (!headerCelda) continue;

            headerCelda.s = estiloHeaderOscuro;
        }
    };

    const aplicarEstiloFilasComentario = (
        worksheet: WorkSheet,
        filasComentario: number[],
        totalColumnas: number,
        XLSX: typeof import('xlsx-js-style'),
    ) => {
        filasComentario.forEach((fila) => {
            for (let c = 0; c < totalColumnas; c += 1) {
                const direccionCelda = XLSX.utils.encode_cell({ r: fila, c });
                const celdaExistente = worksheet[direccionCelda] as
                    | CellObject
                    | undefined;
                const celda = celdaExistente || { t: 's', v: '' };
                celda.s = {
                    ...(celda.s || {}),
                    ...estiloFilaComentario,
                };
                worksheet[direccionCelda] = celda;
            }
        });
    };

    const obtenerNombreHojaDia = (dia: Date) => {
        const nombreDia = format(dia, 'EEEE', { locale: es });
        const nombreDiaCapitalizado =
            nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);

        return `${nombreDiaCapitalizado} ${format(dia, 'd-M')}`;
    };

    const normalizarFecha = (fecha: Date) => {
        const fechaNormalizada = new Date(fecha);
        fechaNormalizada.setHours(0, 0, 0, 0);
        return fechaNormalizada;
    };

    const obtenerUltimaFechaConProduccion = (datos: any[]) => {
        let ultimaFecha: Date | null = null;

        datos.forEach((dato) => {
            if (!Array.isArray(dato.produccion)) {
                return;
            }

            dato.produccion.forEach((prod: any) => {
                const cantidad = Number(prod.cantidad);
                if (!Number.isFinite(cantidad) || cantidad <= 0) {
                    return;
                }

                const fechaProduccion = normalizarFecha(new Date(prod.fecha));
                if (
                    !ultimaFecha ||
                    fechaProduccion.getTime() > ultimaFecha.getTime()
                ) {
                    ultimaFecha = fechaProduccion;
                }
            });
        });

        return ultimaFecha;
    };

    const construirDiasExportacion = (
        diasBase: Date[],
        ultimaFechaConProduccion: Date | null,
    ) => {
        if (diasBase.length === 0) {
            return [];
        }

        const diasOrdenados = [...diasBase].sort(
            (a, b) => a.getTime() - b.getTime(),
        );
        const inicio = normalizarFecha(diasOrdenados[0]);
        const finMinimo = normalizarFecha(
            diasOrdenados[diasOrdenados.length - 1],
        );

        const fin =
            ultimaFechaConProduccion &&
            ultimaFechaConProduccion.getTime() > finMinimo.getTime()
                ? normalizarFecha(ultimaFechaConProduccion)
                : finMinimo;

        const dias: Date[] = [];
        for (
            let fecha = new Date(inicio);
            fecha.getTime() <= fin.getTime();
            fecha = addDays(fecha, 1)
        ) {
            dias.push(new Date(fecha));
        }

        return dias;
    };

    const filtrarDatosParaExportacion = (datos: any[], dias: Date[]) => {
        if (dias.length === 0) {
            return [];
        }

        const fechasValidas = new Set(
            dias.map((dia) => normalizarFecha(dia).getTime()),
        );

        return datos.filter(
            (dato) =>
                Array.isArray(dato.produccion) &&
                dato.produccion.some((prod: any) => {
                    const cantidad = Number(prod.cantidad);
                    if (!Number.isFinite(cantidad) || cantidad <= 0) {
                        return false;
                    }

                    const fechaProduccion = normalizarFecha(
                        new Date(prod.fecha),
                    );
                    return fechasValidas.has(fechaProduccion.getTime());
                }),
        );
    };

    const obtenerDatosExportacionExtendida = async () => {
        const respuesta = await fetch(construirUrlConsulta(true));

        if (!respuesta.ok) {
            throw new Error('Error al obtener datos para exportar');
        }

        const payload = await respuesta.json();
        return Array.isArray(payload.data) ? payload.data : [];
    };

    const exportarExcel = async () => {
        if (diasVisibles.length === 0) {
            return;
        }

        const toastId = toast.loading('Generando Excel', {
            position: 'bottom-right',
            type: 'info',
            theme: 'colored',
            transition: Slide,
        });

        try {
            const datosExtendidos = await obtenerDatosExportacionExtendida();
            const ultimaFechaConProduccion =
                obtenerUltimaFechaConProduccion(datosExtendidos);
            const diasExportacion = construirDiasExportacion(
                diasVisibles,
                ultimaFechaConProduccion,
            );
            const datosExportacion = filtrarDatosParaExportacion(
                datosExtendidos,
                diasExportacion,
            );

            if (diasExportacion.length === 0 || datosExportacion.length === 0) {
                toast.update(toastId, {
                    render: 'No hay datos para exportar',
                    type: 'info',
                    isLoading: false,
                    autoClose: 3000,
                    closeOnClick: true,
                    draggable: true,
                });
                return;
            }

            const encabezados = [
                'Plato',
                'Elaboracion',
                ...diasExportacion.map((dia) =>
                    format(dia, 'EEE, dd-MM', { locale: es }),
                ),
            ];

            const filasExcel: Array<Array<string | number>> = [encabezados];
            const filasComentario: number[] = [];

            datosExportacion.forEach((dato) => {
                const filaPlato: Array<string | number> = [
                    dato.platoPadre || '',
                    dato.plato || '',
                ];

                diasExportacion.forEach((dia) => {
                    filaPlato.push(obtenerCantidadPorDia(dato, dia));
                });

                filasExcel.push(filaPlato);

                if (
                    dato.comentario &&
                    dato.comentario.replace('\n', '') !== ''
                ) {
                    filasComentario.push(filasExcel.length);
                    filasExcel.push([
                        '',
                        dato.comentario,
                        ...Array(diasExportacion.length).fill(''),
                    ]);
                }
            });

            const xlsxModule = await import('xlsx-js-style');
            const XLSX: typeof import('xlsx-js-style') =
                'default' in xlsxModule
                    ? (xlsxModule.default as typeof import('xlsx-js-style'))
                    : xlsxModule;

            const worksheet = XLSX.utils.aoa_to_sheet(filasExcel);
            worksheet['!cols'] =
                obtenerAnchosColumnasPrincipales(datosExportacion);
            aplicarEstiloHeader(worksheet, XLSX);
            aplicarEstiloFilasComentario(
                worksheet,
                filasComentario,
                encabezados.length,
                XLSX,
            );

            const workbook = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                nombreHojaPrincipalExcel,
            );

            diasExportacion.forEach((dia) => {
                const encabezadoDia = format(dia, 'EEE, dd-MM', {
                    locale: es,
                });
                const filasDia: Array<Array<string | number>> = [
                    ['Plato', 'Elaboracion', encabezadoDia, 'Tips'],
                ];

                datosExportacion.forEach((dato) => {
                    const cantidad = obtenerCantidadPorDia(dato, dia);

                    if (typeof cantidad !== 'number' || cantidad <= 0) {
                        return;
                    }

                    filasDia.push([
                        dato.platoPadre || '',
                        dato.plato || '',
                        cantidad,
                        dato.comentario || '',
                    ]);
                });

                const hojaDia = XLSX.utils.aoa_to_sheet(filasDia);
                hojaDia['!cols'] = [
                    ...obtenerAnchosColumnasPrincipales(
                        filasDia.slice(1).map((fila) => ({
                            platoPadre: fila[0],
                            plato: fila[1],
                        })),
                    ),
                    { wch: calcularAnchoColumna(filasDia, 2) },
                    { wch: calcularAnchoColumna(filasDia, 3) },
                ];

                aplicarEstiloHeader(hojaDia, XLSX);

                XLSX.utils.book_append_sheet(
                    workbook,
                    hojaDia,
                    obtenerNombreHojaDia(dia),
                );
            });

            XLSX.writeFile(workbook, nombreArchivoExcel);
            toast.update(toastId, {
                render: 'Excel exportado',
                type: 'success',
                isLoading: false,
                autoClose: 3000,
                closeOnClick: true,
                draggable: true,
            });
        } catch {
            toast.update(toastId, {
                render: 'Error al exportar a Excel',
                type: 'error',
                isLoading: false,
                autoClose: 5000,
                closeOnClick: true,
                draggable: true,
            });
        }
    };

    return (
        <>
            <Container className="mt-5">
                <h2 className="text-center mb-4">{tituloPagina}</h2>

                {!entregaMP && RolProvider !== 'consultor' && (
                    <Container className="mb-3">
                        <Row>
                            <Col>
                                <Accordion className="mb-5">
                                    <Accordion.Item eventKey="0">
                                        <Accordion.Header>
                                            Agregar plato
                                        </Accordion.Header>
                                        <Accordion.Body>
                                            <AgregarPlato
                                                salon={salon}
                                                produccion={true}
                                                setSemanaBase={setSemanaBase}
                                            />
                                        </Accordion.Body>
                                    </Accordion.Item>
                                </Accordion>
                            </Col>
                        </Row>
                    </Container>
                )}

                <Modal
                    container={ref.current ?? undefined}
                    show={showModal}
                    onHide={handleClose}>
                    <Modal.Header closeButton>
                        <Modal.Title>Imprimir recetas</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        ¿Quieres imprimir las recetas separadas o juntas?
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="primary"
                            onClick={() => {
                                void generarPDF('unico');
                            }}>
                            Imprimir juntas
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => {
                                void generarPDF('separado');
                            }}>
                            Imprimir separadas
                        </Button>
                    </Modal.Footer>
                </Modal>

                <Modal
                    container={ref.current ?? undefined}
                    size="xl"
                    show={showModalGestion}
                    onHide={handleCloseModalGestion}>
                    <Modal.Header closeButton>
                        <Modal.Title>
                            Gestionar producción -{' '}
                            {filaGestionProduccion?.plato || ''}
                            {filaGestionProduccion?.platoPadre
                                ? ` - ${filaGestionProduccion.platoPadre}`
                                : ''}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p className="mb-3">
                            Selecciona una o varias fechas de producción para
                            operar sobre ellas.
                        </p>

                        <div style={{ overflowX: 'auto' }}>
                            <Table
                                bordered
                                striped
                                style={{ minWidth: 'max-content' }}>
                                <thead className="table-dark sticky-top">
                                    <tr style={{ textAlign: 'center' }}>
                                        <th className="produccion-columna-control produccion-header-cell"></th>
                                        <th className="produccion-header-cell">
                                            Plato
                                        </th>
                                        <th className="produccion-header-cell">
                                            Elaboracion
                                        </th>
                                        {diasHeaderVisibles.map(
                                            ({ clave, etiqueta }) => (
                                                <th
                                                    key={clave}
                                                    className="produccion-header-cell produccion-header-cell-dia">
                                                    <div className="produccion-header-dia">
                                                        <span className="produccion-header-dia-label">
                                                            {etiqueta}
                                                        </span>
                                                    </div>
                                                </th>
                                            ),
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filaGestionProduccion && (
                                        <tr>
                                            <td className="produccion-columna-control text-center align-middle">
                                                <Gear className="text-secondary" />
                                            </td>
                                            <td className="produccion-columna-texto">
                                                <TextoProduccionTruncado
                                                    texto={
                                                        filaGestionProduccion.platoPadre ||
                                                        ''
                                                    }
                                                    tooltipId={`${modoId}-gestion-plato-padre`}
                                                />
                                            </td>
                                            <td className="produccion-columna-texto">
                                                <TextoProduccionTruncado
                                                    texto={
                                                        filaGestionProduccion.plato ||
                                                        ''
                                                    }
                                                    tooltipId={`${modoId}-gestion-plato`}
                                                />
                                            </td>
                                            {diasHeaderVisibles.map(
                                                ({ clave, dia }) => {
                                                    const produccion =
                                                        obtenerProduccionPorDia(
                                                            filaGestionProduccion,
                                                            dia,
                                                        );
                                                    const cantidad = produccion
                                                        ? produccion.cantidad
                                                        : 0;
                                                    const esCantidadFueraDeCiclo =
                                                        cantidad > 0 &&
                                                        Boolean(
                                                            produccion?.esAnteriorACiclo,
                                                        );
                                                    const estaSeleccionada =
                                                        !!produccion &&
                                                        fechasSeleccionadas.includes(
                                                            produccion.fecha,
                                                        );

                                                    return (
                                                        <td
                                                            key={clave}
                                                            className={[
                                                                estaSeleccionada
                                                                    ? 'table-primary'
                                                                    : '',
                                                                esCantidadFueraDeCiclo
                                                                    ? 'cantidad-fuera-ciclo'
                                                                    : '',
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' ')}>
                                                            {cantidad > 0 && (
                                                                <Button
                                                                    size="sm"
                                                                    disabled={
                                                                        gestionEnCurso
                                                                    }
                                                                    variant={
                                                                        estaSeleccionada
                                                                            ? 'primary'
                                                                            : 'outline-primary'
                                                                    }
                                                                    onClick={() => {
                                                                        alternarFechaSeleccionada(
                                                                            produccion.fecha,
                                                                        );
                                                                    }}>
                                                                    {cantidad}
                                                                </Button>
                                                            )}
                                                        </td>
                                                    );
                                                },
                                            )}
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>

                        <div className="mt-3 mb-3 text-muted">
                            Seleccionadas: {produccionesSeleccionadas.length}
                        </div>

                        <FloatingLabel
                            controlId={`${modoId}-comentario-gestion`}
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
                                style={{ height: '160px' }}
                            />
                        </FloatingLabel>
                    </Modal.Body>
                    <Modal.Footer className="d-flex flex-wrap gap-2 justify-content-between">
                        <div className="d-flex flex-wrap gap-2">
                            {RolProvider !== 'consultor' && (
                                <Button
                                    variant="outline-primary"
                                    disabled={
                                        gestionEnCurso ||
                                        produccionesSeleccionadas.length === 0
                                    }
                                    onClick={() => {
                                        void pasarProduccionesSeleccionadas(
                                            'adelantar',
                                        );
                                    }}>
                                    <ArrowReturnLeft /> Adelantar
                                </Button>
                            )}
                            {RolProvider !== 'consultor' && (
                                <Button
                                    variant="outline-primary"
                                    disabled={
                                        gestionEnCurso ||
                                        produccionesSeleccionadas.length === 0
                                    }
                                    onClick={() => {
                                        void pasarProduccionesSeleccionadas(
                                            'atrasar',
                                        );
                                    }}>
                                    <ArrowReturnRight /> Atrasar
                                </Button>
                            )}
                            {RolProvider !== 'consultor' && (
                                <Button
                                    variant="outline-secondary"
                                    disabled={
                                        gestionEnCurso ||
                                        produccionesSeleccionadas.length === 0
                                    }
                                    onClick={() => {
                                        void guardarComentariosSeleccionados();
                                    }}>
                                    <ChatSquareTextFill /> Guardar comentario
                                </Button>
                            )}
                            <Button
                                variant="outline-danger"
                                disabled={
                                    gestionEnCurso ||
                                    produccionesSeleccionadas.length === 0
                                }
                                onClick={() => {
                                    void eliminarProduccionesSeleccionadas();
                                }}>
                                <Trash /> Eliminar
                            </Button>
                        </div>

                        <div className="d-flex flex-wrap gap-2 justify-content-end">
                            <Button
                                variant="outline-danger"
                                disabled={
                                    gestionEnCurso ||
                                    produccionesSeleccionadas.length === 0
                                }
                                onClick={() => {
                                    void imprimirProduccionesSeleccionadas(
                                        'separado',
                                    );
                                }}>
                                <FiletypePdf /> Imprimir separadas
                            </Button>
                            <Button
                                variant="danger"
                                disabled={
                                    gestionEnCurso ||
                                    produccionesSeleccionadas.length === 0
                                }
                                onClick={() => {
                                    void imprimirProduccionesSeleccionadas(
                                        'unico',
                                    );
                                }}>
                                <FiletypePdf /> Imprimir juntas
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleCloseModalGestion}>
                                Cerrar
                            </Button>
                        </div>
                    </Modal.Footer>
                </Modal>

                <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch align-items-md-center gap-2 mt-3 mb-3">
                    <NavegacionSemanal
                        semanaBase={semanaBase}
                        setSemanaBase={setSemanaBase}
                        justifyContent="start"
                        className="mb-0"
                    />

                    <div className="d-flex justify-content-md-end">
                        <Button
                            className="btn-success"
                            disabled={
                                diasVisibles.length === 0 ||
                                datosVisibles.length === 0
                            }
                            onClick={() => {
                                void exportarExcel();
                            }}>
                            Exportar a Excel
                        </Button>
                    </div>
                </div>
            </Container>

            <div
                ref={ref}
                className="mt-3 mx-auto"
                style={{
                    overflowX: 'auto',
                    overflowY: 'auto',
                    height: '100vh',
                    width: '100%',
                }}>
                <ToastContainer />
                <Table
                    bordered
                    striped
                    style={{ width: '100%' }}
                    id="tabla-produccion">
                    <thead className="table-dark sticky-top">
                        <tr style={{ textAlign: 'center' }}>
                            <th className="produccion-columna-control produccion-header-cell">
                                <Button
                                    size="sm"
                                    className="produccion-header-icon-button"
                                    variant="outline-light"
                                    title={
                                        isFullscreen
                                            ? 'Salir de pantalla completa'
                                            : 'Ver en pantalla completa'
                                    }
                                    aria-label={
                                        isFullscreen
                                            ? 'Salir de pantalla completa'
                                            : 'Ver en pantalla completa'
                                    }
                                    onClick={handleFullscreen}>
                                    {isFullscreen ? (
                                        <FullscreenExit />
                                    ) : (
                                        <Fullscreen />
                                    )}
                                </Button>
                            </th>
                            <th className="produccion-header-cell">Plato</th>
                            <th className="produccion-header-cell">
                                Elaboracion
                            </th>
                            {diasHeaderVisibles.map(
                                ({ clave, dia, etiqueta, mostrarAcciones }) => (
                                    <th
                                        key={clave}
                                        className="produccion-header-cell produccion-header-cell-dia">
                                        <div className="produccion-header-dia">
                                            <span className="produccion-header-dia-label">
                                                {etiqueta}
                                            </span>
                                            {mostrarAcciones && (
                                                <Dropdown align="end">
                                                    <Dropdown.Toggle
                                                        size="sm"
                                                        variant="outline-light"
                                                        id={`${modoId}-dia-menu-${clave}`}
                                                        className="produccion-header-dia-toggle"></Dropdown.Toggle>
                                                    <Dropdown.Menu>
                                                        <Dropdown.Item
                                                            onClick={() => {
                                                                setFechaImprimir(
                                                                    obtenerFechaImpresion(
                                                                        dia,
                                                                    ),
                                                                );
                                                                setShowModal(
                                                                    true,
                                                                );
                                                            }}>
                                                            <FiletypePdf className="text-danger" />{' '}
                                                            Imprimir
                                                        </Dropdown.Item>

                                                        <Dropdown.Item
                                                            onClick={() => {
                                                                setDiaActivo(
                                                                    diaActivo
                                                                        ? ''
                                                                        : clave,
                                                                );
                                                            }}>
                                                            <EyeFill />{' '}
                                                            {diaActivo
                                                                ? 'Ver todos'
                                                                : 'Ver dia'}
                                                        </Dropdown.Item>
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            )}
                                        </div>
                                    </th>
                                ),
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {datosVisibles.map((dato, indexDato) => (
                            <React.Fragment
                                key={
                                    (dato.platoCodigo || dato.plato) +
                                    '|' +
                                    (dato.platoPadreCodigo || dato.platoPadre) +
                                    '|' +
                                    indexDato
                                }>
                                <tr>
                                    <td className="produccion-columna-control text-center">
                                        {RolProvider !== 'consultor' && (
                                            <Button
                                                size="sm"
                                                variant="outline-secondary"
                                                title="Gestionar producción"
                                                aria-label={`Gestionar producción de ${dato.plato || 'fila'}`}
                                                onClick={() => {
                                                    abrirModalGestion(dato);
                                                }}>
                                                <Gear />
                                            </Button>
                                        )}
                                    </td>
                                    <td className="produccion-columna-texto">
                                        <TextoProduccionTruncado
                                            texto={dato.platoPadre || ''}
                                            tooltipId={`${modoId}-plato-padre-${indexDato}`}
                                        />
                                    </td>
                                    <td className="produccion-columna-texto">
                                        <TextoProduccionTruncado
                                            texto={dato.plato || ''}
                                            tooltipId={`${modoId}-plato-${indexDato}`}
                                        />
                                    </td>

                                    {diasHeaderVisibles.map(
                                        ({ clave, dia }) => {
                                            const produccion =
                                                obtenerProduccionPorDia(
                                                    dato,
                                                    dia,
                                                );
                                            const cantidad = produccion
                                                ? produccion.cantidad
                                                : 0;
                                            const esCantidadFueraDeCiclo =
                                                cantidad > 0 &&
                                                Boolean(
                                                    produccion?.esAnteriorACiclo,
                                                );
                                            const claseCelda = [
                                                cantidad > 0 ? 'link-pdf' : '',
                                                esCantidadFueraDeCiclo
                                                    ? 'cantidad-fuera-ciclo'
                                                    : '',
                                            ]
                                                .filter(Boolean)
                                                .join(' ');

                                            return (
                                                <td
                                                    key={clave}
                                                    className={claseCelda}
                                                    onClick={() => {
                                                        if (
                                                            !produccion ||
                                                            cantidad <= 0
                                                        ) {
                                                            return;
                                                        }
                                                        abrirModalGestion(dato, [
                                                            produccion.fecha,
                                                        ]);
                                                    }}>
                                                    {cantidad || ''}
                                                </td>
                                            );
                                        },
                                    )}
                                </tr>
                                {dato.comentario &&
                                    dato.comentario.replace('\n', '') !==
                                        '' && (
                                        <tr className="fst-italic fs-6 text-secondary">
                                            <td className="bg-warning-subtle produccion-columna-control"></td>
                                            <td className="bg-warning-subtle"></td>
                                            <td className="bg-warning-subtle">
                                                {dato.comentario}
                                            </td>
                                            {diasHeaderVisibles.length > 0 && (
                                                <td
                                                    className="bg-warning-subtle"
                                                    colSpan={
                                                        diasHeaderVisibles.length
                                                    }></td>
                                            )}
                                        </tr>
                                    )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </Table>
            </div>
        </>
    );
}
