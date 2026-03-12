/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { NavegacionSemanal } from '@/components/navegacionSemanal';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
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

export default function ProduccionPreviaPage() {
    const salon = useContext(SalonContext);
    const RolProvider = useContext(RolContext);
    const ref = useRef<HTMLTableElement>(null);

    const [diasSemana, setDiasSemana] = useState<Date[]>([]);
    const [diaActivo, setDiaActivo] = useState('');
    const [semanaBase, setSemanaBase] = useState(new Date());
    const [datosApi, setDatosApi] = useState<any[]>([]);
    const [datos, setDatos] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fechaImprimir, setFechaImprimir] = useState<Date | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showModalProduccion, setShowModalProduccion] = useState(false);
    const [observacionModal, setObservacionModal] = useState('');
    const [showModalObservacion, setShowModalObservacion] = useState(false);
    const [paginado, setPaginado] = useState(false);
    const [registrosPagina, setRegistrosPagina] = useState(30);
    const [paginaActual, setPaginaActual] = useState(0);
    const [totalPaginas, setTotalPaginas] = useState(0);
    const [intervaloSegundos, setIntervaloSegundos] = useState(30);
    const [intervaloPaginado, setIntervaloPaginado] =
        useState<ReturnType<typeof setInterval>>();
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
            .then((data) => {
                setDatosApi(data);
                setDatos(data);
            })
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

    const filterDias = (dia: Date) => {
        if (diaActivo && format(addDays(dia, -1), 'yyyy-MM-dd') === diaActivo) {
            return true;
        }

        if (diaActivo && format(dia, 'yyyy-MM-dd') !== diaActivo) {
            return false;
        }

        return true;
    };

    const generarPDF = (modo: 'unico' | 'separado') => {
        toast.info('Imprimiendo recetas', {
            position: 'bottom-right',
            theme: 'colored',
            transition: Slide,
        });

        generarPDFReceta([], fechaImprimir || new Date(), salon, modo, true);

        handleClose();
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
        [diaActivo]
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
                    .then((data) => {
                        setDatosApi(data);
                        setDatos(data);
                    })
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
                    .then((data) => {
                        setDatosApi(data);
                        setDatos(data);
                    })
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

    const tooglePaginado = () => {
        if (paginado) {
            setPaginado(false);
            clearInterval(intervaloPaginado);
            setDatos(datosApi);
            return;
        }

        const totalPags = Math.ceil(datosApi.length / registrosPagina);

        setPaginado(true);
        setTotalPaginas(totalPags);
        setPaginaActual(0);
    };

    useEffect(() => {
        if (!paginado) return;
        if (totalPaginas === 0) return;

        const intervalo = setInterval(() => {
            setPaginaActual((prevPagina) => {
                const nuevaPagina = prevPagina + 1;
                if (nuevaPagina >= totalPaginas) {
                    return 0;
                }
                return nuevaPagina;
            });
        }, intervaloSegundos * 1000);

        setIntervaloPaginado(intervalo);

        return () => clearInterval(intervalo);
    }, [paginado, totalPaginas, intervaloSegundos]);

    useEffect(() => {
        if (!paginado) return;

        const inicio = paginaActual * registrosPagina;
        const fin = inicio + registrosPagina;
        const datosPaginados = datosApi
            .filter(filterPlatosPorDia)
            .slice(inicio, fin);

        setDatos(datosPaginados);
    }, [paginado, paginaActual, registrosPagina, datosApi, filterPlatosPorDia]);

    useEffect(() => {
        if (!paginado) return;

        const totalPags = Math.ceil(
            datosApi.filter(filterPlatosPorDia).length / registrosPagina
        );
        setTotalPaginas(totalPags);
        setPaginaActual(0);
    }, [diaActivo, paginado, registrosPagina, datosApi, filterPlatosPorDia]);

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
        indiceColumna: number
    ) => {
        const maximoCaracteres = filas.reduce((maximo, fila) => {
            const valor = fila[indiceColumna] ?? '';
            return Math.max(maximo, String(valor).length);
        }, 0);

        return maximoCaracteres + 2;
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

    const exportarExcel = () => {
        const encabezados = [
            'Plato',
            'Elaboracion',
            ...diasVisibles.map((dia) =>
                format(dia, 'EEE, dd-MM', { locale: es })
            ),
        ];

        const filasExcel: Array<Array<string | number>> = [encabezados];
        const filasComentario: number[] = [];

        datosVisibles.forEach((dato) => {
            const filaPlato: Array<string | number> = [
                dato.platoPadre || '',
                dato.plato || '',
            ];

            diasVisibles.forEach((dia) => {
                filaPlato.push(obtenerCantidadPorDia(dato, dia));
            });

            filasExcel.push(filaPlato);

            if (dato.comentario && dato.comentario.replace('\n', '') !== '') {
                filasComentario.push(filasExcel.length);
                filasExcel.push([
                    '',
                    dato.comentario,
                    ...Array(diasVisibles.length).fill(''),
                ]);
            }
        });

        import('xlsx-js-style').then((xlsxModule) => {
            const XLSX: typeof import('xlsx-js-style') =
                'default' in xlsxModule
                    ? (xlsxModule.default as typeof import('xlsx-js-style'))
                    : xlsxModule;

            const worksheet = XLSX.utils.aoa_to_sheet(filasExcel);
            worksheet['!cols'] = [
                { wch: calcularAnchoColumna(filasExcel, 0) },
                { wch: calcularAnchoColumna(filasExcel, 1) },
            ];
            aplicarEstiloHeader(worksheet, XLSX);
            aplicarEstiloFilasComentario(
                worksheet,
                filasComentario,
                encabezados.length,
                XLSX
            );

            const workbook = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Entrega MP');

            diasVisibles.forEach((dia) => {
                const encabezadoDia = format(dia, 'EEE, dd-MM', {
                    locale: es,
                });
                const filasDia: Array<Array<string | number>> = [
                    ['Plato', 'Elaboracion', encabezadoDia, 'Tips'],
                ];

                datosVisibles.forEach((dato) => {
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
                    { wch: calcularAnchoColumna(filasDia, 0) },
                    { wch: calcularAnchoColumna(filasDia, 1) },
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
        });
    };

    return (
        <>
            <Container className="mt-5">
                <h2 className="text-center mb-4">Entrega de MP</h2>

                <ToastContainer />

                <Container>
                    <Row>
                        <Col>
                            <Accordion className="mb-5">
                                <Accordion.Item eventKey="0">
                                    <Accordion.Header>
                                        Paginar platos
                                    </Accordion.Header>
                                    <Accordion.Body>
                                        <Container>
                                            <Row>
                                                <Col>
                                                    <Form.Group>
                                                        <Form.Label>
                                                            Cantidad de platos
                                                        </Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            step="1"
                                                            min={1}
                                                            placeholder="Ingresa la cantidad de platos"
                                                            value={
                                                                registrosPagina
                                                            }
                                                            disabled={paginado}
                                                            onChange={(e) =>
                                                                setRegistrosPagina(
                                                                    Number(
                                                                        e.target
                                                                            .value
                                                                    )
                                                                )
                                                            }></Form.Control>
                                                    </Form.Group>
                                                </Col>
                                                <Col>
                                                    <Form.Group>
                                                        <Form.Label>
                                                            Intervalo (segundos)
                                                        </Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            step="any"
                                                            placeholder="Ingresa el intervalo en segundos"
                                                            value={
                                                                intervaloSegundos
                                                            }
                                                            disabled={paginado}
                                                            onChange={(e) =>
                                                                setIntervaloSegundos(
                                                                    Number(
                                                                        e.target
                                                                            .value
                                                                    )
                                                                )
                                                            }></Form.Control>
                                                    </Form.Group>
                                                </Col>
                                                <Col>
                                                    <Button
                                                        style={{
                                                            marginTop: '2rem',
                                                        }}
                                                        className="d-block mx-auto"
                                                        onClick={() =>
                                                            tooglePaginado()
                                                        }>
                                                        {paginado
                                                            ? 'Detener'
                                                            : 'Iniciar'}
                                                    </Button>
                                                </Col>
                                            </Row>
                                        </Container>
                                    </Accordion.Body>
                                </Accordion.Item>
                            </Accordion>
                        </Col>
                    </Row>
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
                                generarPDF('unico');
                            }}>
                            Imprimir juntas
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => {
                                generarPDF('separado');
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
                                generarPDFReceta(
                                    [platoModalProduccion.platoCodigo],
                                    addDays(platoModalProduccion.fecha, 2),
                                    salon,
                                    'separado',
                                    true
                                );

                                toast.info('Imprimiendo receta', {
                                    position: 'bottom-right',
                                    theme: 'colored',
                                    transition: Slide,
                                });
                                handleCloseModalProduccion();
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
                        onClick={exportarExcel}>
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
                                {paginado
                                    ? `Pagina: ${
                                          paginaActual + 1
                                      } / ${totalPaginas}`
                                    : 'Todos los platos'}
                            </th>
                            {[0, 1, 2, 3, 4, 5, 6]
                                .filter(
                                    (i) =>
                                        (diaActivo !== '' &&
                                            (diaActivo ===
                                                format(
                                                    diasSemana[i],
                                                    'yyyy-MM-dd'
                                                ) ||
                                                (i > 0 &&
                                                    diaActivo ===
                                                        format(
                                                            diasSemana[i - 1],
                                                            'yyyy-MM-dd'
                                                        )))) ||
                                        diaActivo === ''
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
                                                                addDays(
                                                                    diasSemana[
                                                                        i
                                                                    ],
                                                                    2
                                                                )
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
                                                                          'yyyy-MM-dd'
                                                                      )
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
                        {datos &&
                            datos
                                .filter((dato) => filterPlatosPorDia(dato))
                                .map((dato, indexDato) => (
                                    <React.Fragment
                                        key={
                                            (dato.platoCodigo || dato.plato) +
                                            '|' +
                                            (dato.platoPadreCodigo ||
                                                dato.platoPadre) +
                                            '|' +
                                            indexDato
                                        }>
                                        <tr>
                                            <td>{dato.platoPadre}</td>
                                            <td>{dato.plato}</td>

                                            {diasVisibles.map((dia, i) => {
                                                    const produccion =
                                                        obtenerProduccionPorDia(
                                                            dato,
                                                            dia
                                                        );
                                                    const cantidad = produccion
                                                        ? produccion.cantidad
                                                        : 0;
                                                    return (
                                                        <td
                                                            key={i}
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
                                                                    }
                                                                );
                                                                setShowModalProduccion(
                                                                    true
                                                                );
                                                            }}>
                                                            {cantidad || ''}
                                                        </td>
                                                    );
                                                })}
                                        </tr>
                                        {dato.comentario &&
                                            dato.comentario.replace(
                                                '\n',
                                                ''
                                            ) !== '' && (
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
