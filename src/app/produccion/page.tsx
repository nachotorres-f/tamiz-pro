/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { NavegacionSemanal } from '@/components/navegacionSemanal';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useContext, useEffect, useRef, useState } from 'react';
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
import { SalonContext } from '@/components/filtroPlatos';
import { Slide, toast, ToastContainer } from 'react-toastify';
import { generarPDFReceta } from '@/lib/generarPDF';
import AgregarPlato from '@/components/agregarPlato';

export default function ProduccionPage() {
    const salon = useContext(SalonContext);
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
        platoPadre: '',
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

    function guardarComentario() {
        toast.warn('Agregando Comentario', {
            position: 'bottom-right',
            theme: 'colored',
            transition: Slide,
        });

        fetch('api/produccion/comentario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plato: platoModalProduccion.plato,
                platoPadre: platoModalProduccion.platoPadre,
                cantidad: platoModalProduccion.cantidad,
                fecha: platoModalProduccion.fecha,
                comentario: observacionModal,
                salon,
            }),
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
                plato: platoModalProduccion.plato,
                platoPadre: platoModalProduccion.platoPadre,
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

        return () => clearInterval(intervaloPaginado);
    }, [paginado, totalPaginas, intervaloSegundos]);

    useEffect(() => {
        if (!paginado) return;

        const inicio = paginaActual * registrosPagina;
        const fin = inicio + registrosPagina;
        const datosPaginados = datosApi
            .filter(filterPlatosPorDia)
            .slice(inicio, fin);

        setDatos(datosPaginados);
    }, [paginado, paginaActual, registrosPagina]);

    useEffect(() => {
        if (!paginado) return;

        const totalPags = Math.ceil(
            datosApi.filter(filterPlatosPorDia).length / registrosPagina
        );
        setTotalPaginas(totalPags);
        setPaginaActual(0);
    }, [diaActivo, paginado, registrosPagina]);

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

    return (
        <>
            <Container className="mt-5">
                <h2 className="text-center mb-4">Produccion</h2>

                <ToastContainer />

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
                        <Button
                            onClick={() => {
                                pasarProduccion('adelantar');
                                handleCloseModalProduccion();
                            }}>
                            <ArrowReturnLeft /> Adelantar Produccion
                        </Button>
                        <Button
                            onClick={() => {
                                pasarProduccion('atrasar');
                                handleCloseModalProduccion();
                            }}>
                            <ArrowReturnRight /> Atrasar Produccion
                        </Button>
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
                            <ChatSquareTextFill /> Agregar / Editar Comentario
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => {
                                generarPDFReceta(
                                    [platoModalProduccion.plato],
                                    platoModalProduccion.fecha,
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
                                                                diasSemana[i]
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
                            {diasSemana.filter(filterDias).map((dia, idx) => (
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
                                .map((dato) => (
                                    <React.Fragment
                                        key={dato.plato + dato.platoPadre}>
                                        <tr>
                                            <td>{dato.platoPadre}</td>
                                            <td>{dato.plato}</td>

                                            {diasSemana
                                                .filter(filterDias)
                                                .map((dia, i) => {
                                                    dia.setHours(0, 0, 0, 0);

                                                    const produccion =
                                                        dato.produccion.find(
                                                            (prod: any) => {
                                                                const fecha =
                                                                    new Date(
                                                                        prod.fecha
                                                                    );
                                                                fecha.setHours(
                                                                    0,
                                                                    0,
                                                                    0,
                                                                    0
                                                                );

                                                                return (
                                                                    fecha.getTime() ===
                                                                    dia.getTime()
                                                                );
                                                            }
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
                                                                setPlatoModalProduccion(
                                                                    {
                                                                        plato: dato.plato,
                                                                        platoPadre:
                                                                            dato.platoPadre,
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
