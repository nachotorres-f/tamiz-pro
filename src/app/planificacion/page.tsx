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

interface ProduccionBase {
    plato: string;
    platoCodigo: string;
    platoPadre: string;
    platoPadreCodigo: string;
    fecha: string;
}

interface ProduccionEdit extends ProduccionBase {
    cantidad: number;
    eliminar?: false;
}

interface ProduccionDelete extends ProduccionBase {
    cantidad: null;
    eliminar: true;
}

type ProduccionChange = ProduccionEdit | ProduccionDelete;

type EstadoAutoGuardado = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

function normalizarFechaProduccion(fecha: string | Date): string {
    const normalizada = new Date(fecha);

    if (!Number.isFinite(normalizada.getTime())) {
        return String(fecha);
    }

    normalizada.setHours(0, 0, 0, 0);
    normalizada.setDate(normalizada.getDate() + 1);

    return format(normalizada, 'yyyy-MM-dd');
}

function construirClaveProduccion(item: {
    platoCodigo: string;
    platoPadreCodigo: string;
    fecha: string | Date;
}): string {
    return `${item.platoCodigo}|||${item.platoPadreCodigo}|||${normalizarFechaProduccion(item.fecha)}`;
}

function esCambioEliminacion(item: any): item is ProduccionDelete {
    return (
        item?.eliminar === true ||
        item?.cantidad === null ||
        item?.cantidad === ''
    );
}

function sanitizarProduccionUpdate(items: any[]): ProduccionChange[] {
    const porClave = new Map<string, ProduccionChange>();

    for (const item of items) {
        const plato = String(item?.plato ?? '').trim();
        const platoCodigo = String(item?.platoCodigo ?? '').trim();
        const platoPadre = String(item?.platoPadre ?? '').trim();
        const platoPadreCodigo = String(item?.platoPadreCodigo ?? '').trim();
        const fecha = String(item?.fecha ?? '').trim();

        if (!platoCodigo || !fecha) {
            continue;
        }

        if (esCambioEliminacion(item)) {
            const normalizado: ProduccionDelete = {
                plato,
                platoCodigo,
                platoPadre,
                platoPadreCodigo,
                fecha,
                cantidad: null,
                eliminar: true,
            };
            porClave.set(construirClaveProduccion(normalizado), normalizado);
            continue;
        }

        const cantidad = Number(item?.cantidad);

        if (!Number.isFinite(cantidad)) {
            continue;
        }

        const normalizado: ProduccionEdit = {
            plato,
            platoCodigo,
            platoPadre,
            platoPadreCodigo,
            fecha,
            cantidad: Number(cantidad.toFixed(2)),
            eliminar: false,
        };

        porClave.set(construirClaveProduccion(normalizado), normalizado);
    }

    return Array.from(porClave.values());
}

function construirFirmaProduccion(items: ProduccionChange[]): string {
    return items
        .map((item) =>
            esCambioEliminacion(item)
                ? `${construirClaveProduccion(item)}=DELETE`
                : `${construirClaveProduccion(item)}=${item.cantidad.toFixed(2)}`,
        )
        .sort()
        .join('|');
}

function mergeProduccionGuardada(
    produccionActual: any[],
    cambiosGuardados: ProduccionChange[],
): any[] {
    const porClave = new Map<string, any>();

    for (const item of produccionActual) {
        const clave = construirClaveProduccion({
            platoCodigo: item.platoCodigo,
            platoPadreCodigo: item.platoPadreCodigo,
            fecha: item.fecha,
        });
        porClave.set(clave, item);
    }

    for (const item of cambiosGuardados) {
        const clave = construirClaveProduccion(item);

        if (esCambioEliminacion(item)) {
            porClave.delete(clave);
            continue;
        }

        const existente = porClave.get(clave) ?? {};

        porClave.set(clave, {
            ...existente,
            plato: item.plato,
            platoCodigo: item.platoCodigo,
            platoPadre: item.platoPadre,
            platoPadreCodigo: item.platoPadreCodigo,
            fecha: item.fecha,
            cantidad: item.cantidad,
        });
    }

    return Array.from(porClave.values());
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
    }, [semanaBase, salonActual, eventoAdelantado, recargaComandas]);

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

        const inicioCiclo = new Date(diasSemana[4]);
        inicioCiclo.setHours(0, 0, 0, 0);
        const finCiclo = addDays(inicioCiclo, 6);
        finCiclo.setHours(0, 0, 0, 0);

        const eventoDentroDeCiclo = (evento: EventoPlanificacion) => {
            const fechaEvento = new Date(evento.fecha);
            fechaEvento.setHours(0, 0, 0, 0);
            return (
                fechaEvento.getTime() >= inicioCiclo.getTime() &&
                fechaEvento.getTime() <= finCiclo.getTime()
            );
        };

        const maxEventosPorDia = (items: EventoPlanificacion[]) => {
            const contador = new Map<number, number>();

            items.forEach((item) => {
                const fechaEvento = new Date(item.fecha);
                fechaEvento.setHours(0, 0, 0, 0);
                const key = fechaEvento.getTime();
                contador.set(key, (contador.get(key) || 0) + 1);
            });

            if (contador.size === 0) return 0;
            return Math.max(...Array.from(contador.values()));
        };

        const paramsBase = new URLSearchParams({
            fechaInicio: format(diasSemana[4], 'yyyy-MM-dd'),
            fechaFinal: format(addDays(diasSemana[4], 6), 'yyyy-MM-dd'),
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

                const eventosCicloTodos = (dataTodos.eventos || []).filter(
                    eventoDentroDeCiclo,
                );
                const eventosCicloHabilitados = (
                    dataFiltrados.eventos || []
                ).filter(eventoDentroDeCiclo);

                setComandasCiclo(eventosCicloTodos);
                setEventos(eventosCicloHabilitados);
                setMaxCantidadEventosDia(
                    maxEventosPorDia(eventosCicloHabilitados),
                );
            })
            .catch(() => {
                setComandasCiclo([]);
                setEventos([]);
                setMaxCantidadEventosDia(0);
            });
    }, [diasSemana, salonActual, recargaComandas]);

    useEffect(() => {
        const inicioSemana = startOfWeek(semanaBase, { weekStartsOn: 4 }); // jueves
        const dias = Array.from({ length: 60 }, (_, i) =>
            addDays(inicioSemana, i),
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

        localStorage.setItem(
            'produccionUpdate',
            JSON.stringify(produccionUpdate),
        );
    }, [produccionUpdate]);

    useEffect(() => {
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
                        const platoCodigo = String(
                            item?.platoCodigo ?? '',
                        ).trim();
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
    }, [produccionUpdate, salonActual, fechaInicioPlanificacion]);

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
            ]),
        ).values(),
    ];

    const inicioSemana = startOfWeek(semanaBase, { weekStartsOn: 1 });
    const finSemana = addDays(inicioSemana, 6);
    const textoSemana = `Semana: ${format(inicioSemana, 'dd/MM/yyyy')} al ${format(finSemana, 'dd/MM/yyyy')}`;

    const handleToggleComanda = async (
        comandaId: number,
        habilitada: boolean,
    ) => {
        const esComandaDelCiclo = comandasCiclo.some(
            (comanda) => comanda.id === comandaId,
        );

        if (!esComandaDelCiclo) {
            toast.warn('Sólo se pueden editar comandas del ciclo actual.', {
                position: 'bottom-right',
                theme: 'colored',
                transition: Slide,
            });
            return;
        }

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
                <h1 className="text-center display-5 fw-bold mb-2">
                    Planificación
                </h1>
                <p className="text-center text-secondary fs-4 fw-semibold mb-4">
                    {textoSemana}
                </p>
                <Container className="mb-3">
                    <div className="border rounded p-2 bg-light">
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
                                    maxHeight: '7rem',
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

                        <div
                            className={`small mb-3 ${
                                estadoAutoGuardado === 'error'
                                    ? 'text-danger'
                                    : 'text-muted'
                            }`}>
                            {estadoAutoGuardado === 'pending' &&
                                'Cambios pendientes de guardado automático...'}
                            {estadoAutoGuardado === 'saving' &&
                                'Guardando cambios automáticamente...'}
                            {estadoAutoGuardado === 'saved' &&
                                `Guardado automático activo${
                                    ultimaSincronizacion
                                        ? ` (último guardado ${format(ultimaSincronizacion, 'HH:mm:ss')})`
                                        : ''
                                }`}
                            {estadoAutoGuardado === 'error' &&
                                'Error al guardar automáticamente. Reintentá en unos segundos.'}
                            {estadoAutoGuardado === 'idle' &&
                                'Guardado automático activo.'}
                        </div>
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
