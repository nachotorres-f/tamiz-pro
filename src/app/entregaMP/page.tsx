/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { NavegacionSemanal } from '@/components/navegacionSemanal';
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
    Button,
    Container,
    Dropdown,
    FloatingLabel,
    Form,
    Modal,
    OverlayTrigger,
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
} from 'react-bootstrap-icons';
import { MoonLoader } from 'react-spinners';
import { RolContext, SalonContext } from '@/components/filtroPlatos';
import { Slide, toast, ToastContainer } from 'react-toastify';
import { generarPDFReceta } from '@/lib/generarPDF';

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

function TextoEntregaMPTruncado({
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

export default function ProduccionPreviaPage() {
    const salon = useContext(SalonContext);
    const RolProvider = useContext(RolContext);
    const ref = useRef<HTMLTableElement>(null);

    const [diasSemana, setDiasSemana] = useState<Date[]>([]);
    const [diaActivo, setDiaActivo] = useState('');
    const [semanaBase, setSemanaBase] = useState(new Date());
    const [datosApi, setDatosApi] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fechaImprimir, setFechaImprimir] = useState<Date | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showModalProduccion, setShowModalProduccion] = useState(false);
    const [observacionModal, setObservacionModal] = useState('');
    const [showModalObservacion, setShowModalObservacion] = useState(false);
    const [platoModalProduccion, setPlatoModalProduccion] = useState({
        plato: '',
        platoCodigo: '',
        platoPadre: '',
        platoPadreCodigo: '',
        comentario: undefined,
        cantidad: 0,
        fecha: new Date(),
    });

    useEffect(() => {
        setLoading(true);
        fetch(
            '/api/produccion?fechaInicio=' +
                semanaBase.toISOString() +
                '&previa=true' +
                '&salon=' +
                salon
        )
            .then((res) => res.json())
            .then((res) => res.data)
            .then(setDatosApi)
            .finally(() => {
                setLoading(false);
            });
    }, [semanaBase, salon]);

    useEffect(() => {
        const inicioSemana = semanaBase;
        const dias = Array.from({ length: 7 }, (_, i) =>
            addDays(inicioSemana, i)
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
            /* Safari */
            (element as any).webkitRequestFullscreen();
            setIsFullscreen(true);
        } else if ((element as any).msRequestFullscreen) {
            /* IE11 */
            (element as any).msRequestFullscreen();
            setIsFullscreen(true);
        }
    }

    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
            /* Safari */
            (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
            /* IE11 */
            (document as any).msExitFullscreen();
        }
    }

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
            await generarPDFReceta(listaPlatos, fecha, salon, modo, true);
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
    const handleCloseModalProduccion = () => setShowModalProduccion(false);
    const handleCloseModalObservacion = () => setShowModalObservacion(false);

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

    function guardarComentario() {
        if (
            !platoModalProduccion.platoCodigo ||
            !platoModalProduccion.fecha ||
            !salon
        ) {
            toast.error('Selecciona un plato con producción para comentar', {
                position: 'bottom-right',
                theme: 'colored',
                transition: Slide,
            });
            return;
        }

        toast.warn('Agregando Comentario', {
            position: 'bottom-right',
            theme: 'colored',
            transition: Slide,
        });

        fetch('api/produccion/comentario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                platoCodigo: platoModalProduccion.platoCodigo,
                platoPadreCodigo: platoModalProduccion.platoPadreCodigo,
                cantidad: platoModalProduccion.cantidad,
                fecha: addDays(platoModalProduccion.fecha, 2),
                comentario: observacionModal,
                salon,
            }),
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Error al guardar comentario');
                }
                return res.json();
            })
            .then(() => {
                toast.success('Comentario guardado', {
                    position: 'bottom-right',
                    theme: 'colored',
                    transition: Slide,
                });
                setLoading(true);
                fetch(
                    '/api/produccion?fechaInicio=' +
                        semanaBase.toISOString() +
                        '&previa=true' +
                        '&salon=' +
                        salon
                )
                    .then((res) => res.json())
                    .then((res) => res.data)
                    .then(setDatosApi)
                    .finally(() => {
                        setLoading(false);
                    });
            })
            .catch(() => {
                toast.error('Error al guardar el comentario', {
                    position: 'bottom-right',
                    theme: 'colored',
                    transition: Slide,
                });
                setLoading(false);
            });
    }

    const pasarProduccion = async (accion: 'adelantar' | 'atrasar') => {
        toast.warn('Pasando produccion', {
            position: 'bottom-right',
            theme: 'colored',
            transition: Slide,
        });

        fetch('api/produccion/' + accion, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                platoCodigo: platoModalProduccion.platoCodigo,
                platoPadreCodigo: platoModalProduccion.platoPadreCodigo,
                cantidad: platoModalProduccion.cantidad,
                fecha: addDays(platoModalProduccion.fecha, 2),
                salon,
            }),
        })
            .then(() => {
                toast.success(`Producción ${accion.replace('r', 'ada')}`, {
                    position: 'bottom-right',
                    theme: 'colored',
                    transition: Slide,
                });
                setLoading(true);
                fetch(
                    '/api/produccion?fechaInicio=' +
                        semanaBase.toISOString() +
                        '&previa=true' +
                        '&salon=' +
                        salon
                )
                    .then((res) => res.json())
                    .then((res) => res.data)
                    .then(setDatosApi)
                    .finally(() => {
                        setLoading(false);
                    });
            })
            .catch(() => {
                toast.error(`Error al ${accion} la producción`, {
                    position: 'bottom-right',
                    theme: 'colored',
                    transition: Slide,
                });
                setLoading(false);
            });
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
                etiqueta: format(dia, 'EEE, dd-MM', { locale: es }),
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
        XLSX: typeof import('xlsx-js-style')
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
        XLSX: typeof import('xlsx-js-style')
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
        ultimaFechaConProduccion: Date | null
    ) => {
        if (diasBase.length === 0) {
            return [];
        }

        const diasOrdenados = [...diasBase].sort(
            (a, b) => a.getTime() - b.getTime()
        );
        const inicio = normalizarFecha(diasOrdenados[0]);
        const finMinimo = normalizarFecha(diasOrdenados[diasOrdenados.length - 1]);

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
            dias.map((dia) => normalizarFecha(dia).getTime())
        );

        return datos.filter(
            (dato) =>
                Array.isArray(dato.produccion) &&
                dato.produccion.some((prod: any) => {
                    const cantidad = Number(prod.cantidad);
                    if (!Number.isFinite(cantidad) || cantidad <= 0) {
                        return false;
                    }

                    const fechaProduccion = normalizarFecha(new Date(prod.fecha));
                    return fechasValidas.has(fechaProduccion.getTime());
                })
        );
    };

    const obtenerDatosExportacionExtendida = async () => {
        const respuesta = await fetch(
            '/api/produccion?fechaInicio=' +
                semanaBase.toISOString() +
                '&previa=true' +
                '&salon=' +
                salon +
                '&hastaUltimo=true'
        );

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
                ultimaFechaConProduccion
            );
            const datosExportacion = filtrarDatosParaExportacion(
                datosExtendidos,
                diasExportacion
            );

            if (
                diasExportacion.length === 0 ||
                datosExportacion.length === 0
            ) {
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
                    format(dia, 'EEE, dd-MM', { locale: es })
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

                if (dato.comentario && dato.comentario.replace('\n', '') !== '') {
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
            worksheet['!cols'] = obtenerAnchosColumnasPrincipales(
                datosExportacion
            );
            aplicarEstiloHeader(worksheet, XLSX);
            aplicarEstiloFilasComentario(
                worksheet,
                filasComentario,
                encabezados.length,
                XLSX
            );

            const workbook = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Entrega MP');

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
                        filasDia
                            .slice(1)
                            .map((fila) => ({
                                platoPadre: fila[0],
                                plato: fila[1],
                            }))
                    ),
                    { wch: calcularAnchoColumna(filasDia, 2) },
                    { wch: calcularAnchoColumna(filasDia, 3) },
                ];

                aplicarEstiloHeader(hojaDia, XLSX);

                XLSX.utils.book_append_sheet(
                    workbook,
                    hojaDia,
                    obtenerNombreHojaDia(dia)
                );
            });

            XLSX.writeFile(workbook, 'entregaMP.xlsx');
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
                <h2 className="text-center mb-4">Entrega de MP</h2>

                <ToastContainer />

                <Modal
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
                    size="xl"
                    show={showModalProduccion}
                    onHide={handleCloseModalProduccion}>
                    <Modal.Header closeButton>
                        <Modal.Title>
                            {platoModalProduccion.plato}{' '}
                            {platoModalProduccion.platoPadre
                                ? ' - ' + platoModalProduccion.platoPadre
                                : ''}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>¿Que accion quieres realizar?</Modal.Body>
                    <Modal.Footer>
                        {RolProvider !== 'consultor' && (
                            <Button
                                onClick={() => {
                                    pasarProduccion('adelantar');
                                    handleCloseModalProduccion();
                                }}>
                                <ArrowReturnLeft /> Adelantar Produccion
                            </Button>
                        )}
                        {RolProvider !== 'consultor' && (
                            <Button
                                onClick={() => {
                                    pasarProduccion('atrasar');
                                    handleCloseModalProduccion();
                                }}>
                                <ArrowReturnRight /> Atrasar Produccion
                            </Button>
                        )}
                        {RolProvider !== 'consultor' && (
                            <Button
                                onClick={() => {
                                    setObservacionModal(
                                        platoModalProduccion.comentario
                                            ? platoModalProduccion.comentario
                                            : ''
                                    );
                                    handleCloseModalProduccion();
                                    setShowModalObservacion(true);
                                }}>
                                <ChatSquareTextFill /> Agregar / Editar
                                Comentario
                            </Button>
                        )}
                        <Button
                            variant="danger"
                            onClick={() => {
                                handleCloseModalProduccion();
                                void imprimirRecetas(
                                    [platoModalProduccion.platoCodigo],
                                    addDays(platoModalProduccion.fecha, 2),
                                    'separado',
                                    'Imprimiendo receta',
                                    'Receta impresa',
                                );
                            }}>
                            <FiletypePdf /> Imprimir receta
                        </Button>
                    </Modal.Footer>
                </Modal>

                <Modal
                    show={showModalObservacion}
                    onHide={handleCloseModalObservacion}>
                    <Modal.Header closeButton>
                        <Modal.Title>
                            Observacion - {platoModalProduccion.plato}{' '}
                            {platoModalProduccion.platoPadre
                                ? ' - ' + platoModalProduccion.platoPadre
                                : ''}
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
                                    >
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
                                handleCloseModalObservacion();
                            }}>
                            Cerrar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => {
                                guardarComentario();
                                handleCloseModalObservacion();
                            }}>
                            Guardar Cambios
                        </Button>
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
                                                        id={`entrega-mp-dia-menu-${clave}`}
                                                        className="produccion-header-dia-toggle"></Dropdown.Toggle>
                                                    <Dropdown.Menu>
                                                        <Dropdown.Item
                                                            onClick={() => {
                                                                setFechaImprimir(
                                                                    addDays(
                                                                        dia,
                                                                        2,
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
                                    <td className="produccion-columna-control"></td>
                                    <td className="produccion-columna-texto">
                                        <TextoEntregaMPTruncado
                                            texto={dato.platoPadre || ''}
                                            tooltipId={`entrega-mp-plato-padre-${indexDato}`}
                                        />
                                    </td>
                                    <td className="produccion-columna-texto">
                                        <TextoEntregaMPTruncado
                                            texto={dato.plato || ''}
                                            tooltipId={`entrega-mp-plato-${indexDato}`}
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

                                            return (
                                                <td
                                                    key={clave}
                                                    className={
                                                        cantidad > 0
                                                            ? 'link-pdf'
                                                            : ''
                                                    }
                                                    onClick={() => {
                                                        if (
                                                            !produccion ||
                                                            cantidad <= 0
                                                        ) {
                                                            return;
                                                        }

                                                        setPlatoModalProduccion(
                                                            {
                                                                plato: dato.plato,
                                                                platoCodigo:
                                                                    dato.platoCodigo,
                                                                platoPadre:
                                                                    dato.platoPadre,
                                                                platoPadreCodigo:
                                                                    dato.platoPadreCodigo,
                                                                cantidad,
                                                                fecha: produccion.fecha,
                                                                comentario:
                                                                    produccion.comentario
                                                                        ? dato.comentario
                                                                        : '',
                                                            },
                                                        );
                                                        setShowModalProduccion(
                                                            true,
                                                        );
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
