/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { NavegacionSemanal } from '@/components/navegacionSemanal';
import { addDays, format, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
    Accordion,
    Button,
    Col,
    Container,
    Dropdown,
    Form,
    Modal,
    Row,
    Table,
} from 'react-bootstrap';
import { FiletypePdf, ArrowsFullscreen, EyeFill } from 'react-bootstrap-icons';
import { Slide, toast } from 'react-toastify';
import AgregarPlato from '@/components/agregarPlato';
import { SalonContext } from '@/components/filtroPlatos';
import { generarPDFReceta } from '@/lib/generarPDF';
import { ToastContainer } from 'react-toastify';
import { Loading } from '@/components/loading';

export default function ProduccionPage() {
    const salon = useContext(SalonContext);

    //const [filtro, setFiltro] = useState('');
    const [filtro] = useState('');
    const [diasSemana, setDiasSemana] = useState<Date[]>([]);
    const [diaActivo, setDiaActivo] = useState('');
    const [semanaBase, setSemanaBase] = useState(new Date());
    const [datos, setDatos] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [filtroSalon, setFiltroSalon] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fechaImprimir, setFechaImprimir] = useState<Date | null>(null);

    const ref = useRef<HTMLTableElement>(null);

    const handleFullscreen = () => {
        if (ref.current && !isFullscreen) goFullscreen(ref.current);

        if (isFullscreen) {
            exitFullscreen();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        if (salon) {
            setFiltroSalon(salon); // sincroniza el estado con el context
        }
    }, [salon]);

    useEffect(() => {
        setLoading(true);
        fetch(
            '/api/produccion?fechaInicio=' +
                startOfWeek(semanaBase, { weekStartsOn: 1 }).toISOString() +
                '&previa=true'
        )
            .then((res) => res.json())
            .then((res) => res.data)
            .then(setDatos)
            .finally(() => {
                setLoading(false);
            });
    }, [semanaBase]);

    useEffect(() => {
        const dias = Array.from({ length: 7 }, (_, i) =>
            addDays(semanaBase, i)
        );
        setDiasSemana(dias);
        setDiaActivo('');
    }, [semanaBase]);

    const filterDias = (dia: Date) => {
        if (diaActivo && format(dia, 'yyyy-MM-dd') !== diaActivo) {
            return false;
        }

        return true;
    };

    const filterPlatos = (dato: any) => {
        if (!filtro) return true;

        return dato.plato.toLowerCase().includes(filtro.toLowerCase());
    };

    const handleClose = () => setShowModal(false);

    const filterSalon = (dato: any) => {
        if (!filtroSalon) return true;

        return dato.salon === filtroSalon;
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

    const generarPDF = (modo: 'unico' | 'separado') => {
        toast.info('Imprimiendo recetas', {
            position: 'bottom-right',
            theme: 'colored',
            transition: Slide,
        });

        generarPDFReceta(
            [],
            fechaImprimir || new Date(),
            filtroSalon || 'A',
            modo
        );

        handleClose();
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <>
            <Container className="mt-5">
                <h2 className="text-center mb-4">Produccion</h2>

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
                                            salon={filtroSalon || 'A'}
                                            produccion={true}
                                            setSemanaBase={setSemanaBase}
                                        />
                                    </Accordion.Body>
                                </Accordion.Item>
                            </Accordion>
                        </Col>
                    </Row>
                    <Row>
                        <Col xs={4}>
                            <Form.Group>
                                <Form.Label>Filtrar por dia</Form.Label>
                                <Form.Select
                                    value={diaActivo}
                                    onChange={(e) =>
                                        setDiaActivo(e.target.value)
                                    }>
                                    <option value="">Todos los dias</option>
                                    {diasSemana.map((dia, i) => {
                                        const fecha = format(dia, 'yyyy-MM-dd');
                                        return (
                                            <option
                                                key={i}
                                                value={fecha}>
                                                {format(
                                                    dia,
                                                    "EEEE, dd 'de' MMMM",
                                                    {
                                                        locale: es,
                                                    }
                                                )
                                                    .split(' ')
                                                    .map((word) => {
                                                        if (word === 'de') {
                                                            return 'de';
                                                        }
                                                        return (
                                                            word
                                                                .charAt(0)
                                                                .toUpperCase() +
                                                            word.slice(1)
                                                        );
                                                    })
                                                    .join(' ')}
                                            </option>
                                        );
                                    })}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                </Container>

                <NavegacionSemanal
                    semanaBase={semanaBase}
                    setSemanaBase={setSemanaBase}
                />
            </Container>

            <div
                className="d-flex flex-row justify-content-evenly mt-3 mx-auto flex-wrap"
                style={{ width: '100%' }}>
                {diasSemana.filter(filterDias).map((dia, i) => {
                    // Primero filtramos y procesamos los datos para este día
                    const datosDelDia = datos
                        .filter(filterPlatos)
                        .filter(filterSalon)
                        .map((dato) => {
                            dia.setHours(0, 0, 0, 0);
                            const produccion = dato.produccion.find(
                                (prod: any) => {
                                    const fecha = new Date(prod.fecha);
                                    fecha.setHours(0, 0, 0, 0);
                                    return fecha.getTime() === dia.getTime();
                                }
                            );
                            const cantidad = produccion
                                ? produccion.cantidad
                                : 0;

                            // Solo incluimos los datos que tienen cantidad
                            if (cantidad > 0) {
                                return {
                                    plato: dato.plato,
                                    cantidad: cantidad,
                                    comentario: produccion.comentario,
                                };
                            }
                            return null;
                        })
                        .filter(Boolean); // Eliminamos los elementos null

                    return (
                        <div
                            key={i}
                            style={{
                                height: diaActivo ? 'max-content' : '50vh',
                                overflow: 'auto',
                                width: diaActivo ? '100%' : 'max-content',
                            }}
                            ref={diaActivo ? ref : null}>
                            <Table
                                className="table-striped "
                                style={{
                                    width: diaActivo ? '100%' : '300px',
                                    margin: '',
                                    maxHeight: diaActivo ? '80vh' : '',
                                }}
                                bordered>
                                <thead className="table-dark sticky-top">
                                    <tr>
                                        <th colSpan={4}>
                                            {format(dia, "EEEE, dd 'de' MMMM", {
                                                locale: es,
                                            })
                                                .split(' ')
                                                .map((word) => {
                                                    if (word === 'de') {
                                                        return 'de';
                                                    }
                                                    return (
                                                        word
                                                            .charAt(0)
                                                            .toUpperCase() +
                                                        word.slice(1)
                                                    );
                                                })
                                                .join(' ')}{' '}
                                            {datosDelDia.length > 0 && (
                                                <>
                                                    <Dropdown className="btn btn-sm">
                                                        <Dropdown.Toggle
                                                            variant="primary"
                                                            id="dropdown-basic"></Dropdown.Toggle>
                                                        <Dropdown.Menu>
                                                            <Dropdown.Item
                                                                onClick={() => {
                                                                    setFechaImprimir(
                                                                        dia
                                                                    );
                                                                    setShowModal(
                                                                        true
                                                                    );
                                                                }}>
                                                                <FiletypePdf className="text-danger" />{' '}
                                                                Imprimir
                                                            </Dropdown.Item>
                                                            <Dropdown.Item
                                                                onClick={() => {
                                                                    setDiaActivo(
                                                                        format(
                                                                            dia,
                                                                            'yyyy-MM-dd'
                                                                        )
                                                                    );

                                                                    setTimeout(
                                                                        () => {
                                                                            handleFullscreen();
                                                                        },
                                                                        0
                                                                    );
                                                                }}>
                                                                <ArrowsFullscreen />{' '}
                                                                Pantalla
                                                                Completa
                                                            </Dropdown.Item>
                                                            <Dropdown.Item
                                                                onClick={() => {
                                                                    if (
                                                                        isFullscreen
                                                                    )
                                                                        handleFullscreen();
                                                                    setDiaActivo(
                                                                        diaActivo
                                                                            ? ''
                                                                            : format(
                                                                                  dia,
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
                                                </>
                                            )}
                                        </th>
                                    </tr>
                                    <tr>
                                        <th></th>
                                        <th>Plato</th>
                                        <th>
                                            Cantidad{' '}
                                            {datosDelDia.length > 0
                                                ? `(${datosDelDia.length})`
                                                : ''}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {datosDelDia.length > 0 ? (
                                        datosDelDia.map((dato, i) => (
                                            <React.Fragment
                                                key={dato && dato.plato}>
                                                <tr
                                                    style={{
                                                        textAlign: 'center',
                                                        height:
                                                            datosDelDia.length -
                                                                1 !==
                                                            i
                                                                ? 'max-content'
                                                                : '',
                                                    }}>
                                                    <td>
                                                        <Button
                                                            className="btn-danger"
                                                            size="sm"
                                                            style={{
                                                                width: '2rem',
                                                                height: '2rem',
                                                                display:
                                                                    'block',
                                                                justifyContent:
                                                                    'center',
                                                                alignItems:
                                                                    'center',
                                                                margin: 'auto',
                                                            }}
                                                            onClick={() => {
                                                                if (dato) {
                                                                    toast.info(
                                                                        'Imprimiendo receta',
                                                                        {
                                                                            position:
                                                                                'bottom-right',
                                                                            theme: 'colored',
                                                                            transition:
                                                                                Slide,
                                                                        }
                                                                    );
                                                                    setFechaImprimir(
                                                                        dia
                                                                    );
                                                                    generarPDFReceta(
                                                                        [
                                                                            dato.plato,
                                                                        ],
                                                                        dia,
                                                                        filtroSalon ||
                                                                            'A',
                                                                        'unico'
                                                                    );
                                                                }
                                                            }}>
                                                            <FiletypePdf />
                                                        </Button>
                                                    </td>
                                                    <td>
                                                        {dato && dato.plato}
                                                    </td>
                                                    <td>
                                                        {dato && dato.cantidad}
                                                    </td>
                                                </tr>

                                                {dato?.comentario && (
                                                    <tr className="text-center text-wrap fst-italic fs-6 text-secondary">
                                                        <td colSpan={4}>
                                                            {dato.comentario}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                style={{
                                                    textAlign: 'center',
                                                    fontStyle: 'italic',
                                                    color: '#666',
                                                }}>
                                                No hay nada para producir
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
