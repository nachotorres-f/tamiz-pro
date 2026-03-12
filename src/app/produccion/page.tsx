/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { NavegacionSemanal } from '@/components/navegacionSemanal';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useContext, useEffect, useRef, useState } from 'react';
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
    Row,
    Table,
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
import AgregarPlato from '@/components/agregarPlato';

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

export default function ProduccionPage() {
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
                '&salon=' +
                salon,
        )
            .then((res) => res.json())
            .then((res) => res.data)
            .then((data) => {
                setDatosApi(data);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [semanaBase, salon]);

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

    const filterDias = (dia: Date) => {
        if (diaActivo && format(addDays(dia, -1), 'yyyy-MM-dd') === diaActivo) {
            return true;
        }

        if (diaActivo && format(dia, 'yyyy-MM-dd') !== diaActivo) {
            return false;
        }

        return true;
    };

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
            await generarPDFReceta(listaPlatos, fecha, salon, modo, false);
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

    const filterPlatosPorDia = (dato: any) => {
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
    };

    const obtenerCantidadPorDia = (dato: any, dia: Date) => {
        const diaNormalizado = new Date(dia);
        diaNormalizado.setHours(0, 0, 0, 0);

        const produccion = dato.produccion.find((prod: any) => {
            const fecha = new Date(prod.fecha);
            fecha.setHours(0, 0, 0, 0);

            return fecha.getTime() === diaNormalizado.getTime();
        });

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
                fecha: platoModalProduccion.fecha,
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
                        '&salon=' +
                        salon,
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
                fecha: addDays(platoModalProduccion.fecha, -1),
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
                        '&salon=' +
                        salon,
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

    const diasVisibles = diasSemana.filter(filterDias);
    const datosVisibles = datosApi
        ? datosApi.filter((dato) => filterPlatosPorDia(dato))
        : [];

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
            dias.map((dia) => normalizarFecha(dia).getTime()),
        );

        return datos.filter((dato) =>
            Array.isArray(dato.produccion) &&
            dato.produccion.some((prod: any) => {
                const cantidad = Number(prod.cantidad);
                if (!Number.isFinite(cantidad) || cantidad <= 0) {
                    return false;
                }

                const fechaProduccion = normalizarFecha(new Date(prod.fecha));
                return fechasValidas.has(fechaProduccion.getTime());
            }),
        );
    };

    const obtenerDatosExportacionExtendida = async () => {
        const respuesta = await fetch(
            '/api/produccion?fechaInicio=' +
                semanaBase.toISOString() +
                '&salon=' +
                salon +
                '&hastaUltimo=true',
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
                ultimaFechaConProduccion,
            );
            const datosExportacion = filtrarDatosParaExportacion(
                datosExtendidos,
                diasExportacion,
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
                datosExportacion,
            );
            aplicarEstiloHeader(worksheet, XLSX);
            aplicarEstiloFilasComentario(
                worksheet,
                filasComentario,
                encabezados.length,
                XLSX,
            );

            const workbook = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Produccion');

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

            XLSX.writeFile(workbook, 'produccion.xlsx');
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
                <h2 className="text-center mb-4">Produccion</h2>

                <ToastContainer />

                <Container className="mb-3">
                    {RolProvider !== 'consultor' && (
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
                    )}
                </Container>

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
                                            : '',
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
                                    platoModalProduccion.fecha,
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

                <NavegacionSemanal
                    semanaBase={semanaBase}
                    setSemanaBase={setSemanaBase}
                />

                <div className="d-flex justify-content-center mt-3">
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
            </Container>

            <div
                ref={ref}
                className="mt-3 mx-auto"
                style={{
                    overflowY: 'auto',
                    height: '100vh',
                    width: '100%',
                }}>
                <Table
                    bordered
                    striped
                    id="tabla-produccion">
                    <thead className="table-dark sticky-top">
                        <tr style={{ textAlign: 'center' }}>
                            <th>
                                <Button onClick={handleFullscreen}>
                                    {isFullscreen ? (
                                        <FullscreenExit />
                                    ) : (
                                        <Fullscreen />
                                    )}{' '}
                                    Pantalla Completa
                                </Button>
                            </th>
                            <th>
                                Todos los platos
                            </th>
                            {[0, 1, 2, 3, 4, 5, 6]
                                .filter(
                                    (i) =>
                                        (diaActivo !== '' &&
                                            (diaActivo ===
                                                format(
                                                    diasSemana[i],
                                                    'yyyy-MM-dd',
                                                ) ||
                                                (i > 0 &&
                                                    diaActivo ===
                                                        format(
                                                            diasSemana[i - 1],
                                                            'yyyy-MM-dd',
                                                        )))) ||
                                        diaActivo === '',
                                )
                                .map((i) => {
                                    return (
                                        <th key={i}>
                                            <Dropdown className="btn btn-sm">
                                                <Dropdown.Toggle
                                                    variant="primary"
                                                    id="dropdown-basic"></Dropdown.Toggle>
                                                <Dropdown.Menu>
                                                    <Dropdown.Item
                                                        onClick={() => {
                                                            setFechaImprimir(
                                                                diasSemana[i],
                                                            );
                                                            setShowModal(true);
                                                        }}>
                                                        <FiletypePdf className="text-danger" />{' '}
                                                        Imprimir
                                                    </Dropdown.Item>

                                                    <Dropdown.Item
                                                        onClick={() => {
                                                            setDiaActivo(
                                                                diaActivo
                                                                    ? ''
                                                                    : format(
                                                                          diasSemana[
                                                                              i
                                                                          ],
                                                                          'yyyy-MM-dd',
                                                                      ),
                                                            );
                                                        }}>
                                                        <EyeFill />{' '}
                                                        {diaActivo
                                                            ? 'Ver todos'
                                                            : 'Ver dia'}
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        </th>
                                    );
                                })}
                        </tr>
                        <tr style={{ textAlign: 'center' }}>
                            <th>Plato</th>
                            <th>Elaboracion</th>
                            {diasVisibles.map((dia, idx) => (
                                <th key={idx}>
                                    {format(dia, 'EEE, dd-MM', { locale: es })}
                                </th>
                            ))}
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
                                    <td>{dato.platoPadre}</td>
                                    <td>{dato.plato}</td>

                                    {diasVisibles.map((dia, i) => {
                                        dia.setHours(0, 0, 0, 0);

                                        const produccion = dato.produccion.find(
                                            (prod: any) => {
                                                const fecha = new Date(
                                                    prod.fecha,
                                                );
                                                fecha.setHours(0, 0, 0, 0);

                                                return (
                                                    fecha.getTime() ===
                                                    dia.getTime()
                                                );
                                            },
                                        );
                                        const cantidad = produccion
                                            ? produccion.cantidad
                                            : 0;
                                        const esCantidadFueraDeCiclo =
                                            cantidad > 0 &&
                                            Boolean(
                                                produccion?.esAnteriorACiclo,
                                            );
                                        return (
                                            <td
                                                key={i}
                                                className={
                                                    cantidad > 0
                                                        ? 'link-pdf'
                                                        : ''
                                                }
                                                style={
                                                    esCantidadFueraDeCiclo
                                                        ? { color: '#d97706' }
                                                        : undefined
                                                }
                                                onClick={() => {
                                                    if (!produccion || cantidad <= 0) {
                                                        return;
                                                    }
                                                    setPlatoModalProduccion({
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
                                                    });
                                                    setShowModalProduccion(
                                                        true,
                                                    );
                                                }}>
                                                {cantidad || ''}
                                            </td>
                                        );
                                    })}
                                </tr>
                                {dato.comentario &&
                                    dato.comentario.replace('\n', '') !==
                                        '' && (
                                        <tr className="fst-italic fs-6 text-secondary">
                                            <td className="bg-warning-subtle"></td>
                                            <td className="bg-warning-subtle">
                                                {dato.comentario}
                                            </td>
                                            <td
                                                className="bg-warning-subtle"
                                                colSpan={999}></td>
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
