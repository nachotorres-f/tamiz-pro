/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
    useContext,
    useEffect,
    //  useRef,
    useState,
} from 'react';
import {
    // Accordion,
    Button,
    Col,
    Container,
    Form,
    Row,
    // Form
} from 'react-bootstrap';
// import Row from 'react-bootstrap/Row';
// import Col from 'react-bootstrap/Col';
import { addDays, format, startOfWeek } from 'date-fns';
import React from 'react';
// import { FiltroPlatos } from '@/components/filtroPlatos';
// import { SelectorDias } from '@/components/selectorDias';
// import { NavegacionSemanal } from '@/components/navegacionSemanal';
import { TablaPlanificacion } from '@/components/tablaPlanificacion';
// import AgregarPlato from '@/components/agregarPlato';
import { Slide, toast, ToastContainer } from 'react-toastify';
import { RolContext, SalonContext } from '@/components/filtroPlatos';
import { Loading } from '@/components/loading';

export interface EventoPlanificacion {
    id: number;
    fecha: string;
    lugar: string;
    nombre: string;
    salon: string;
    deshabilitadaPlanificacion?: boolean;
    // agrega aquí otras propiedades si existen
}

export default function PlanificacionPage() {
    const filtroSalon = useContext(SalonContext);
    const RolProvider = useContext(RolContext);
    const salonActual = filtroSalon || 'A';

    const [semanaBase] = useState(new Date());
    const [diasSemana, setDiasSemana] = useState<Date[]>([]);
    const [datos, setDatos] = useState<any[]>([]);
    const [eventos, setEventos] = React.useState<EventoPlanificacion[]>([]);
    const [comandasCiclo, setComandasCiclo] = React.useState<
        EventoPlanificacion[]
    >([]);
    const [recargaComandas, setRecargaComandas] = useState(0);
    const [actualizandoComandaId, setActualizandoComandaId] = useState<
        number | null
    >(null);
    const [maxCantidadEventosDia, setMaxCantidadEventosDia] = useState(0);
    const [produccion, setProduccion] = useState<any[]>([]);
    const [datosFiltrados, setDatosFiltrados] = useState<any[]>([]);
    const [filtro] = useState('');
    const [diaActivo, setDiaActivo] = useState('');
    const [platoExpandido, setPlatoExpandido] = useState<string | null>(null);
    const [produccionUpdate, setProduccionUpdate] = React.useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [observaciones, setObservaciones] = useState<
        { plato: string; observacion: string; platoPadre: string }[]
    >([]);
    const [eventoAdelantado, setEventoAdelantado] = useState(0);

    // Referencias para medir el ancho de las celdas
    // const buttonRef = useRef<HTMLTableCellElement>(null);
    // const platoRef = useRef<HTMLTableCellElement>(null);
    // const totalRef = useRef<HTMLTableCellElement>(null);
    // const [anchoButton, setAnchoButton] = useState(0);
    // const [anchoPlato, setAnchoPlato] = useState(0);
    // const [anchoTotal, setAnchoTotal] = useState(0);

    // useEffect(() => {
    //     if (buttonRef.current) {
    //         setAnchoButton(buttonRef.current.offsetWidth);
    //     }
    //     if (platoRef.current) {
    //         setAnchoPlato(platoRef.current.offsetWidth);
    //     }
    //     if (totalRef.current) {
    //         setAnchoTotal(totalRef.current.offsetWidth);
    //     }
    // }, [buttonRef, platoRef, totalRef]);

    useEffect(() => {
        setLoading(true);
        fetch(
            '/api/planificacion?fechaInicio=' +
                startOfWeek(addDays(semanaBase, 4), {
                    weekStartsOn: 1,
                }).toISOString() +
                '&salon=' +
                salonActual,
        ) // jueves
            .then((res) => res.json())
            .then((data) => {
                setDatos(data.planifacion || []);
                setProduccion(data.produccion || []);
            })
            .finally(() => {
                setLoading(false);
            });

        setProduccionUpdate(
            JSON.parse(localStorage.getItem('produccionUpdate') || '[]')
        );
    }, [
        semanaBase,
        salonActual,
        eventoAdelantado,
        recargaComandas,
    ]);

    useEffect(() => {
        if (diasSemana.length < 5) return;

        const paramsBase = new URLSearchParams({
            fechaInicio: format(diasSemana[4], 'yyyy-MM-dd'),
            fechaFinal: format(diasSemana[diasSemana.length - 1], 'yyyy-MM-dd'),
            salon: salonActual,
        });

        const paramsTodos = new URLSearchParams(paramsBase.toString());
        paramsTodos.set('incluirDeshabilitadas', 'true');

        const paramsFiltrados = new URLSearchParams(paramsBase.toString());

        Promise.all([
            fetch('/api/eventosPlanificacion?' + paramsTodos.toString()),
            fetch('/api/eventosPlanificacion?' + paramsFiltrados.toString()),
        ])
            .then(async ([resTodos, resFiltrados]) => {
                const [dataTodos, dataFiltrados] = await Promise.all([
                    resTodos.json(),
                    resFiltrados.json(),
                ]);
                setComandasCiclo(dataTodos.eventos || []);
                setEventos(dataFiltrados.eventos || []);
                setMaxCantidadEventosDia(dataFiltrados.maxRepeticion || 0);
            })
            .catch(() => {
                setComandasCiclo([]);
                setEventos([]);
                setMaxCantidadEventosDia(0);
            });
    }, [
        diasSemana,
        salonActual,
        recargaComandas,
    ]);

    useEffect(() => {
        const inicioSemana = startOfWeek(semanaBase, { weekStartsOn: 4 }); // jueves
        const dias = Array.from({ length: 60 }, (_, i) =>
            addDays(inicioSemana, i)
        );
        setDiasSemana(dias);
        setDiaActivo('');
    }, [semanaBase]);

    useEffect(() => {
        if (filtroSalon) {
            // const datosFiltrados = datos.filter((d) => {
            //     if (filtroSalon === 'A') {
            //         return filtroSalon === 'A'
            //             ? d.lugar.toLowerCase().trim() !== 'el central'
            //             : d.lugar.toLowerCase().trim() !== 'la rural';
            //     }

            //     if (filtroSalon === 'B') {
            //         return filtroSalon === 'B'
            //             ? d.lugar.toLowerCase().trim() === 'el central'
            //             : d.lugar.toLowerCase().trim() === 'la rural';
            //     }
            // });
            setDatosFiltrados(datos);
        } else {
            setDatosFiltrados(datos);
        }
    }, [filtroSalon, datos]);

    const handleGuardarProduccion = async () => {
        toast.warn('Actualizando produccion', {
            position: 'bottom-right',
            theme: 'colored',
            transition: Slide,
        });

        await fetch('/api/planificacion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                salon: salonActual,
                produccion: produccionUpdate,
                observaciones,
                fechaInicio: startOfWeek(addDays(semanaBase, 4), {
                    weekStartsOn: 1,
                })
                    .toISOString()
                    .split('T')[0],
            }),
        })
            .then(() => {
                toast.success('Produccion actualizada', {
                    position: 'bottom-right',
                    theme: 'colored',
                    transition: Slide,
                });

                setProduccionUpdate([]);
                localStorage.removeItem('produccionUpdate');
            })
            .catch(() => {
                toast.error('Error al actualizar la producción', {
                    position: 'bottom-right',
                    theme: 'colored',
                    transition: Slide,
                });
            });

        setProduccionUpdate([]);

        await fetch(
            '/api/planificacion?fechaInicio=' +
                startOfWeek(addDays(semanaBase, 4), {
                    weekStartsOn: 1,
                }).toISOString() +
                '&salon=' +
                salonActual,
        ) // jueves
            .then((res) => res.json())
            .then((data) => {
                setDatos(data.planifacion || []);
                setProduccion(data.produccion || []);
            })
            .finally(() => {});
    };

    const platosUnicos = [
        ...new Map(
            datosFiltrados.map((d) => [
                `${d.plato}-${d.platoPadre}`,
                {
                    plato: d.plato,
                    platoPadre: d.platoPadre,
                },
            ])
        ).values(),
    ];

    const handleLimpiarProduccion = () => {
        setProduccionUpdate([]);
        localStorage.removeItem('produccionUpdate');
        toast.info('Producción limpiada', {
            position: 'bottom-right',
            theme: 'colored',
            transition: Slide,
        });
    };

    const inicioSemana = startOfWeek(semanaBase, { weekStartsOn: 1 });
    const finSemana = addDays(inicioSemana, 6);
    const textoSemana = `Semana: ${format(inicioSemana, 'dd/MM/yyyy')} al ${format(finSemana, 'dd/MM/yyyy')}`;

    const handleToggleComanda = async (comandaId: number, habilitada: boolean) => {
        setActualizandoComandaId(comandaId);

        await fetch('/api/planificacion/comanda', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: comandaId,
                deshabilitada: !habilitada,
            }),
        })
            .then(async (res) => {
                if (!res.ok) {
                    const data = await res.json().catch(() => null);
                    throw new Error(
                        data?.error || 'Error al actualizar la comanda',
                    );
                }
            })
            .then(() => {
                setRecargaComandas((prev) => prev + 1);
            })
            .catch((error) => {
                toast.error(error.message || 'Error al actualizar la comanda', {
                    position: 'bottom-right',
                    theme: 'colored',
                    transition: Slide,
                });
            })
            .finally(() => {
                setActualizandoComandaId(null);
            });
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <div>
            <ToastContainer />
            <Container className="mt-5 flex-grow-1">
                <h2 className="text-center mb-4">Planificación</h2>
                <p className="text-center text-muted mb-3">{textoSemana}</p>
                <Container className="mb-3">
                    <div className="border rounded p-3 bg-light">
                        <div className="fw-semibold">Comandas del ciclo</div>
                        <div className="text-muted small mb-2">
                            Desactivá una comanda para excluir sus platos del
                            cálculo. Volvé a activarla para revertir cambios.
                        </div>
                        {comandasCiclo.length === 0 ? (
                            <div className="text-muted small">
                                No hay comandas para el ciclo seleccionado.
                            </div>
                        ) : (
                            <div
                                style={{
                                    maxHeight: '12rem',
                                    overflowY: 'auto',
                                }}>
                                {comandasCiclo.map((comanda) => {
                                    const deshabilitada =
                                        comanda.deshabilitadaPlanificacion;
                                    return (
                                        <Form.Check
                                            key={comanda.id}
                                            type="switch"
                                            id={`comanda-ciclo-${comanda.id}`}
                                            className="mb-1"
                                            checked={!deshabilitada}
                                            disabled={
                                                actualizandoComandaId ===
                                                    comanda.id ||
                                                RolProvider === 'consultor'
                                            }
                                            onChange={(e) =>
                                                handleToggleComanda(
                                                    comanda.id,
                                                    e.target.checked,
                                                )
                                            }
                                            label={`${format(new Date(comanda.fecha), 'dd/MM/yyyy')} - ${comanda.lugar} - ${comanda.salon} - ${comanda.nombre}`}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </Container>

                {/* <Form.Group>
                <Row>
                    <Col>
                        <FiltroPlatos
                            filtro={filtro}
                            setFiltro={setFiltro}
                        />
                    </Col>
                    <Col>
                        <SelectorDias
                            diasSemana={diasSemana}
                            setDiaActivo={setDiaActivo}
                        />
                    </Col>
                </Row>
            </Form.Group> */}

                {/* EVENTOS */}

                {RolProvider !== 'consultor' && (
                    <Container>
                        <Row>
                            <Col>
                                {/* <Accordion className="mb-5">
                                    <Accordion.Item eventKey="0">
                                        <Accordion.Header>
                                            Agregar plato
                                        </Accordion.Header>
                                        <Accordion.Body>
                                            <AgregarPlato
                                                salon={filtroSalon || 'A'}
                                                produccion={false}
                                                setSemanaBase={setSemanaBase}
                                            />
                                        </Accordion.Body>
                                    </Accordion.Item>
                                </Accordion> */}
                            </Col>
                        </Row>

                        <Row>
                            <Col xs={4}>
                                {/* <Row>
                                <Col>
                                    <Form.Group>
                                        <Form.Label>
                                            Filtrar por salón
                                        </Form.Label>
                                        <Form.Select
                                            value={filtroSalon || ''}
                                            onChange={(e) => {
                                                setFiltroSalon(e.target.value);
                                                sessionStorage.setItem(
                                                    'filtroSalon',
                                                    e.target.value
                                                );
                                            }}>
                                            <option value="A">
                                                Rut Haus - Origami
                                            </option>
                                            <option value="B">
                                                El Central - La Rural
                                            </option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row> */}
                            </Col>
                            <Col>
                                {/* <TablaEventosPlanificacion
                                diasSemana={diasSemana}
                                diaActivo={diaActivo}
                                filtroSalon={filtroSalon}
                                // anchoColumna={anchoButton + anchoPlato + anchoTotal}
                            /> */}
                            </Col>
                        </Row>

                        <Row>
                            <Col xs={4}>
                                <Button
                                    type="button"
                                    className="btn btn-success mb-3"
                                    onClick={handleGuardarProduccion}>
                                    Guardar Cambios
                                </Button>
                                <Button
                                    type="button"
                                    className="btn btn-primary mb-3 ms-2"
                                    onClick={handleLimpiarProduccion}>
                                    Limpiar cambios
                                </Button>
                            </Col>
                            <Col xs={4}></Col>
                            <Col xs={4}>
                                {/* <NavegacionSemanal
                                semanaBase={semanaBase}
                                setSemanaBase={setSemanaBase}
                            /> */}
                            </Col>
                        </Row>
                    </Container>
                )}
            </Container>

            <div
                id="container-planificacion"
                className="mb-3"
                style={{ overflow: 'auto', height: '90vh' }}>
                <TablaPlanificacion
                    platosUnicos={platosUnicos}
                    diasSemana={diasSemana}
                    datos={datosFiltrados}
                    filtro={filtro}
                    diaActivo={diaActivo}
                    platoExpandido={platoExpandido}
                    setPlatoExpandido={setPlatoExpandido}
                    pageOcultos={false}
                    produccion={produccion}
                    setProduccion={setProduccion}
                    produccionUpdate={produccionUpdate}
                    setProduccionUpdate={setProduccionUpdate}
                    observaciones={observaciones}
                    setObservaciones={setObservaciones}
                    maxCantidadEventosDia={maxCantidadEventosDia}
                    eventos={eventos}
                    setEventoAdelantado={setEventoAdelantado}
                    // Referencias para medir el ancho de las celdas
                    // buttonRef={buttonRef}
                    // anchoButton={anchoButton}
                    // anchoPlato={anchoPlato}
                    // anchoTotal={anchoTotal}
                />
            </div>
        </div>
    );
}
