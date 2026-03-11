/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
    useContext,
    useEffect,
    useRef,
    //  useRef,
    useState,
} from 'react';
import {
    // Accordion,
    Col,
    Container,
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
import {
    construirClaveProduccion,
    construirFirmaProduccion,
    esCambioEliminacion,
    mergeProduccionGuardada,
    sanitizarProduccionUpdate,
} from './produccionUtils';
import { ComandasCicloPanel } from '@/components/planificacion/ComandasCicloPanel';
import { GuardadoProduccionPanel } from '@/components/planificacion/GuardadoProduccionPanel';

export interface EventoPlanificacion {
    id: number;
    fecha: string;
    lugar: string;
    nombre: string;
    salon: string;
    deshabilitadaPlanificacion?: boolean;
    // agrega aquí otras propiedades si existen
}

type EstadoAutoGuardado = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

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
    const [actualizandoPlanificacion, setActualizandoPlanificacion] =
        useState(false);
    const [observaciones, setObservaciones] = useState<
        {
            plato: string;
            platoCodigo: string;
            observacion: string;
            platoPadre: string;
            platoPadreCodigo: string;
        }[]
    >([]);
    const [eventoAdelantado, setEventoAdelantado] = useState(0);
    const [estadoAutoGuardado, setEstadoAutoGuardado] =
        useState<EstadoAutoGuardado>('idle');
    const [ultimaSincronizacion, setUltimaSincronizacion] =
        useState<Date | null>(null);
    const [guardandoManual, setGuardandoManual] = useState(false);
    const ultimaFirmaGuardadaRef = useRef('');
    const cambiosInicialesCargadosRef = useRef(false);
    const primeraCargaPlanificacionRef = useRef(true);
    const toastActualizandoPlanificacionRef = useRef<string | number | null>(
        null,
    );

    const fechaInicioPlanificacion = startOfWeek(addDays(semanaBase, 4), {
        weekStartsOn: 1,
    })
        .toISOString()
        .split('T')[0];

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
        const primeraCarga = primeraCargaPlanificacionRef.current;
        const abortController = new AbortController();

        if (primeraCarga) {
            setLoading(true);
        } else {
            setActualizandoPlanificacion(true);
        }

        fetch(
            '/api/planificacion?fechaInicio=' +
                startOfWeek(addDays(semanaBase, 4), {
                    weekStartsOn: 1,
                }).toISOString() +
                '&salon=' +
                salonActual,
            {
                signal: abortController.signal,
            },
        ) // jueves
            .then((res) => res.json())
            .then((data) => {
                setDatos(data.planifacion || []);
                setProduccion(data.produccion || []);
            })
            .catch((error) => {
                if (error?.name === 'AbortError') {
                    return;
                }
            })
            .finally(() => {
                if (abortController.signal.aborted) {
                    return;
                }

                if (primeraCarga) {
                    setLoading(false);
                    primeraCargaPlanificacionRef.current = false;
                    return;
                }

                setActualizandoPlanificacion(false);
            });

        return () => {
            abortController.abort();
        };
    }, [
        semanaBase,
        salonActual,
        eventoAdelantado,
        recargaComandas,
    ]);

    useEffect(() => {
        const cambiosGuardados = JSON.parse(
            localStorage.getItem('produccionUpdate') || '[]',
        );
        setProduccionUpdate(
            Array.isArray(cambiosGuardados) ? cambiosGuardados : [],
        );
        cambiosInicialesCargadosRef.current = true;
    }, []);

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

    useEffect(() => {
        if (!cambiosInicialesCargadosRef.current) {
            return;
        }

        if (produccionUpdate.length === 0) {
            localStorage.removeItem('produccionUpdate');
            return;
        }

        localStorage.setItem('produccionUpdate', JSON.stringify(produccionUpdate));
    }, [produccionUpdate]);

    useEffect(() => {
        if (guardandoManual) {
            return;
        }

        const cambiosPendientes = sanitizarProduccionUpdate(produccionUpdate);

        if (cambiosPendientes.length === 0) {
            setEstadoAutoGuardado('idle');
            return;
        }

        const firmaPendiente = construirFirmaProduccion(cambiosPendientes);

        if (firmaPendiente === ultimaFirmaGuardadaRef.current) {
            setEstadoAutoGuardado('saved');
            return;
        }

        setEstadoAutoGuardado('pending');

        const timerId = window.setTimeout(async () => {
            setEstadoAutoGuardado('saving');

            try {
                const response = await fetch('/api/planificacion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        salon: salonActual,
                        produccion: cambiosPendientes,
                        observaciones: [],
                        fechaInicio: fechaInicioPlanificacion,
                    }),
                });

                if (!response.ok) {
                    throw new Error('No se pudieron guardar los cambios');
                }

                const cambiosPorClave = new Map(
                    cambiosPendientes.map((item) => [
                        construirClaveProduccion(item),
                        item,
                    ]),
                );

                setProduccion((prevProduccion) =>
                    mergeProduccionGuardada(prevProduccion, cambiosPendientes),
                );
                setProduccionUpdate((prevCambios) =>
                    prevCambios.filter((item) => {
                        const platoCodigo = String(item?.platoCodigo ?? '').trim();
                        const platoPadreCodigo = String(
                            item?.platoPadreCodigo ?? '',
                        ).trim();
                        const fecha = String(item?.fecha ?? '').trim();

                        if (!platoCodigo || !fecha) {
                            return true;
                        }

                        const clave = construirClaveProduccion({
                            platoCodigo,
                            platoPadreCodigo,
                            fecha,
                        });
                        const cantidadGuardada = cambiosPorClave.get(clave);

                        if (cantidadGuardada === undefined) {
                            return true;
                        }

                        if (esCambioEliminacion(cantidadGuardada)) {
                            return !esCambioEliminacion(item);
                        }

                        const cantidadActual = Number(item?.cantidad);

                        if (!Number.isFinite(cantidadActual)) {
                            return true;
                        }

                        return (
                            Number(cantidadActual.toFixed(2)) !==
                            cantidadGuardada.cantidad
                        );
                    }),
                );

                ultimaFirmaGuardadaRef.current = firmaPendiente;
                setUltimaSincronizacion(new Date());
                setEstadoAutoGuardado('saved');
            } catch {
                setEstadoAutoGuardado('error');
            }
        }, 900);

        return () => window.clearTimeout(timerId);
    }, [
        produccionUpdate,
        salonActual,
        fechaInicioPlanificacion,
        guardandoManual,
    ]);

    useEffect(() => {
        if (actualizandoPlanificacion) {
            if (
                toastActualizandoPlanificacionRef.current === null ||
                !toast.isActive(toastActualizandoPlanificacionRef.current)
            ) {
                toastActualizandoPlanificacionRef.current = toast.info(
                    'Actualizando planificación...',
                    {
                        position: 'bottom-right',
                        theme: 'colored',
                        transition: Slide,
                        autoClose: false,
                        closeOnClick: false,
                        draggable: false,
                    },
                );
            }
            return;
        }

        if (toastActualizandoPlanificacionRef.current !== null) {
            toast.dismiss(toastActualizandoPlanificacionRef.current);
            toastActualizandoPlanificacionRef.current = null;
        }
    }, [actualizandoPlanificacion]);

    useEffect(
        () => () => {
            if (toastActualizandoPlanificacionRef.current !== null) {
                toast.dismiss(toastActualizandoPlanificacionRef.current);
            }
        },
        [],
    );

    const handleGuardarProduccion = async () => {
        toast.warn('Actualizando produccion', {
            position: 'bottom-right',
            theme: 'colored',
            transition: Slide,
        });

        setGuardandoManual(true);

        try {
            const cambiosManual = sanitizarProduccionUpdate(produccionUpdate);
            const response = await fetch('/api/planificacion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    salon: salonActual,
                    produccion: cambiosManual,
                    observaciones,
                    fechaInicio: fechaInicioPlanificacion,
                }),
            });

            if (!response.ok) {
                throw new Error();
            }

            toast.success('Produccion actualizada', {
                position: 'bottom-right',
                theme: 'colored',
                transition: Slide,
            });

            setProduccionUpdate([]);
            ultimaFirmaGuardadaRef.current = '';
            setUltimaSincronizacion(new Date());
            setEstadoAutoGuardado('saved');

            const res = await fetch(
                '/api/planificacion?fechaInicio=' +
                    startOfWeek(addDays(semanaBase, 4), {
                        weekStartsOn: 1,
                    }).toISOString() +
                    '&salon=' +
                    salonActual,
            ); // jueves
            const data = await res.json();
            setDatos(data.planifacion || []);
            setProduccion(data.produccion || []);
        } catch {
            toast.error('Error al actualizar la producción', {
                position: 'bottom-right',
                theme: 'colored',
                transition: Slide,
            });
            setEstadoAutoGuardado('error');
        } finally {
            setGuardandoManual(false);
        }
    };

    const platosUnicos = [
        ...new Map(
            datosFiltrados.map((d) => [
                `${d.platoCodigo}-${d.platoPadreCodigo}`,
                {
                    plato: d.plato,
                    platoCodigo: d.platoCodigo,
                    platoPadre: d.platoPadre,
                    platoPadreCodigo: d.platoPadreCodigo,
                },
            ])
        ).values(),
    ];

    const handleLimpiarProduccion = () => {
        setProduccionUpdate([]);
        ultimaFirmaGuardadaRef.current = '';
        setEstadoAutoGuardado('idle');
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
                    <ComandasCicloPanel
                        comandasCiclo={comandasCiclo}
                        actualizandoComandaId={actualizandoComandaId}
                        esConsultor={RolProvider === 'consultor'}
                        onToggleComanda={handleToggleComanda}
                    />
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
                                <GuardadoProduccionPanel
                                    estadoAutoGuardado={estadoAutoGuardado}
                                    ultimaSincronizacion={ultimaSincronizacion}
                                    onGuardar={handleGuardarProduccion}
                                    onLimpiar={handleLimpiarProduccion}
                                />
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
