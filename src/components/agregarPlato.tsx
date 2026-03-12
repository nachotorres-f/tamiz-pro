'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button, Col, Container, Form, Modal, Row } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import Select from 'react-select';
import { MoonLoader } from 'react-spinners';

import 'react-datepicker/dist/react-datepicker.css';
import { Slide, toast, ToastContainer } from 'react-toastify';
import { es } from 'date-fns/locale';

type Plato = { codigo: string | number; nombreProducto: string };
type FilaPlato = {
    id: number;
    platoCodigo: string;
    cantidad: string;
    fecha: Date;
};
type FilaAEnviar = {
    filaId: number;
    platoCodigo: string;
    cantidad: string;
    fecha: string;
    platoPadreCodigo?: string;
};
type ResultadoValidacionFilas =
    | { ok: false; error: string }
    | { ok: true; filas: FilaAEnviar[] };

type PadreCandidato = {
    codigo: string;
    nombre: string;
};

type FilaAmbigua = {
    index: number;
    filaId: number | null;
    platoCodigo: string;
    fecha: string;
    cantidad: number;
    padres: PadreCandidato[];
};

type ResultadoGuardarProduccion =
    | { status: 'ok' }
    | { status: 'ambiguo'; ambiguos: FilaAmbigua[] }
    | { status: 'error' };

const crearFilaPlato = (id: number, fecha?: Date): FilaPlato => ({
    id,
    platoCodigo: '',
    cantidad: '',
    fecha: fecha ? new Date(fecha) : new Date(),
});

const toastConfig = {
    position: 'bottom-right' as const,
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: 'colored' as const,
    transition: Slide,
};

const FILA_INICIAL_ID = 1;
const CODIGO_ERROR_AMBIGUO = 'PLATO_PADRE_AMBIGUO';

const construirMensajeExito = (cantidadFilas: number) =>
    `${cantidadFilas} plato${cantidadFilas > 1 ? 's' : ''} agregado${
        cantidadFilas > 1 ? 's' : ''
    } correctamente`;

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
    typeof valor === 'object' && valor !== null;

const esPadreCandidato = (valor: unknown): valor is PadreCandidato => {
    if (!esObjeto(valor)) {
        return false;
    }

    return typeof valor.codigo === 'string' && typeof valor.nombre === 'string';
};

const esFilaAmbigua = (valor: unknown): valor is FilaAmbigua => {
    if (!esObjeto(valor)) {
        return false;
    }

    if (
        typeof valor.index !== 'number' ||
        (typeof valor.filaId !== 'number' && valor.filaId !== null) ||
        typeof valor.platoCodigo !== 'string' ||
        typeof valor.fecha !== 'string' ||
        typeof valor.cantidad !== 'number' ||
        !Array.isArray(valor.padres)
    ) {
        return false;
    }

    return valor.padres.every(esPadreCandidato);
};

export default function AgregarPlato({
    salon,
    produccion,
    setSemanaBase,
}: {
    salon: string;
    produccion: boolean;
    setSemanaBase: (date: Date) => void;
}) {
    const nextFilaIdRef = useRef(FILA_INICIAL_ID + 1);
    const [platos, setPlatos] = useState<Plato[]>([]);
    const [filasPlatos, setFilasPlatos] = useState<FilaPlato[]>([
        crearFilaPlato(FILA_INICIAL_ID),
    ]);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [client, setIsClient] = useState(false);

    const [showModalPadre, setShowModalPadre] = useState(false);
    const [ambiguedadesPendientes, setAmbiguedadesPendientes] = useState<
        FilaAmbigua[]
    >([]);
    const [indiceAmbiguedad, setIndiceAmbiguedad] = useState(0);
    const [padreSeleccionadoActual, setPadreSeleccionadoActual] =
        useState('');
    const [resolucionesPadre, setResolucionesPadre] = useState<
        Record<string, string>
    >({});
    const [filasPendientes, setFilasPendientes] = useState<FilaAEnviar[] | null>(
        null,
    );

    const ambiguedadActual = ambiguedadesPendientes[indiceAmbiguedad] ?? null;

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        fetch('/api/platos')
            .then((res) => res.json())
            .then((data) => {
                setPlatos(data.platos);
            });
    }, []);

    useEffect(() => {
        if (!showModalPadre || !ambiguedadActual) {
            setPadreSeleccionadoActual('');
            return;
        }

        const clave =
            ambiguedadActual.filaId !== null
                ? `id:${ambiguedadActual.filaId}`
                : `idx:${ambiguedadActual.index}`;

        setPadreSeleccionadoActual(
            resolucionesPadre[clave] || ambiguedadActual.padres[0]?.codigo || '',
        );
    }, [showModalPadre, ambiguedadActual, resolucionesPadre]);

    const mostrarToast = (
        tipo: 'warn' | 'error' | 'success',
        mensaje: string,
    ) => {
        setMounted(true);
        if (tipo === 'warn') toast.warn(mensaje, toastConfig);
        if (tipo === 'error') toast.error(mensaje, toastConfig);
        if (tipo === 'success') toast.success(mensaje, toastConfig);

        setTimeout(() => {
            setMounted(false);
        }, 5000);
    };

    const agregarFila = () => {
        setFilasPlatos((prev) => {
            const ultimaFecha = prev[prev.length - 1]?.fecha;
            return [
                ...prev,
                crearFilaPlato(nextFilaIdRef.current++, ultimaFecha),
            ];
        });
    };

    const eliminarFila = (id: number) => {
        setFilasPlatos((prev) => {
            const nuevasFilas = prev.filter((fila) => fila.id !== id);
            if (nuevasFilas.length === 0) {
                return [crearFilaPlato(nextFilaIdRef.current++)];
            }

            return nuevasFilas;
        });
    };

    const actualizarFila = (
        id: number,
        cambios: Partial<Omit<FilaPlato, 'id'>>,
    ) => {
        setFilasPlatos((prev) =>
            prev.map((fila) =>
                fila.id === id ? { ...fila, ...cambios } : fila,
            ),
        );
    };

    const obtenerFilasAEnviar = (): ResultadoValidacionFilas => {
        const filasConDatos = filasPlatos.filter((fila) => {
            const tienePlato = fila.platoCodigo.trim() !== '';
            const tieneCantidad = fila.cantidad.trim() !== '';
            return tienePlato || tieneCantidad;
        });

        if (filasConDatos.length === 0) {
            return { ok: false, error: 'Completa todos los campos' };
        }

        const tieneIncompletos = filasConDatos.some((fila) => {
            const cantidadNum = Number(fila.cantidad);
            return (
                fila.platoCodigo.trim() === '' ||
                fila.cantidad.trim() === '' ||
                !Number.isFinite(cantidadNum) ||
                cantidadNum <= 0
            );
        });

        if (tieneIncompletos) {
            return { ok: false, error: 'Completa todos los campos' };
        }

        return {
            ok: true,
            filas: filasConDatos.map((fila) => ({
                filaId: fila.id,
                platoCodigo: fila.platoCodigo,
                cantidad: Number(fila.cantidad).toFixed(2),
                fecha: fila.fecha.toISOString(),
            })),
        };
    };

    const resetResolucionPadre = () => {
        setShowModalPadre(false);
        setAmbiguedadesPendientes([]);
        setIndiceAmbiguedad(0);
        setPadreSeleccionadoActual('');
        setResolucionesPadre({});
        setFilasPendientes(null);
    };

    const aplicarResolucionesPadre = (
        filas: FilaAEnviar[],
        resoluciones: Record<string, string>,
    ): FilaAEnviar[] => {
        return filas.map((fila, index) => {
            const codigoPadre =
                resoluciones[`id:${fila.filaId}`] || resoluciones[`idx:${index}`];

            if (!codigoPadre) {
                return { ...fila };
            }

            return {
                ...fila,
                platoPadreCodigo: codigoPadre,
            };
        });
    };

    const enviarPlatosProduccion = async (
        filas: FilaAEnviar[],
    ): Promise<ResultadoGuardarProduccion> => {
        const response = await fetch('api/produccion/plato', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                salon,
                platos: filas,
            }),
        });

        if (response.ok) {
            return { status: 'ok' };
        }

        let payload: unknown = null;
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }

        if (response.status === 409 && esObjeto(payload)) {
            const code =
                typeof payload.code === 'string' ? payload.code : undefined;
            const ambiguosRaw = Array.isArray(payload.ambiguos)
                ? payload.ambiguos
                : [];
            const ambiguos = ambiguosRaw.filter(esFilaAmbigua);

            if (code === CODIGO_ERROR_AMBIGUO && ambiguos.length > 0) {
                return { status: 'ambiguo', ambiguos };
            }
        }

        return { status: 'error' };
    };

    const iniciarResolucionPadre = (
        filas: FilaAEnviar[],
        ambiguos: FilaAmbigua[],
    ) => {
        setFilasPendientes(filas);
        setAmbiguedadesPendientes(ambiguos);
        setIndiceAmbiguedad(0);
        setResolucionesPadre({});
        setPadreSeleccionadoActual(ambiguos[0]?.padres[0]?.codigo || '');
        setShowModalPadre(true);
    };

    const completarAltaExitosa = (cantidadFilas: number) => {
        setSemanaBase(new Date());
        setFilasPlatos([crearFilaPlato(nextFilaIdRef.current++)]);
        mostrarToast('success', construirMensajeExito(cantidadFilas));
    };

    const cancelarResolucionPadre = () => {
        resetResolucionPadre();
        mostrarToast('warn', 'Alta cancelada. No se guardaron cambios');
    };

    const confirmarSeleccionPadre = async () => {
        if (!ambiguedadActual || !padreSeleccionadoActual) {
            return;
        }

        const clave =
            ambiguedadActual.filaId !== null
                ? `id:${ambiguedadActual.filaId}`
                : `idx:${ambiguedadActual.index}`;

        const nuevasResoluciones = {
            ...resolucionesPadre,
            [clave]: padreSeleccionadoActual,
        };

        if (indiceAmbiguedad < ambiguedadesPendientes.length - 1) {
            setResolucionesPadre(nuevasResoluciones);
            setIndiceAmbiguedad((prev) => prev + 1);
            return;
        }

        if (!filasPendientes) {
            resetResolucionPadre();
            return;
        }

        setResolucionesPadre(nuevasResoluciones);
        setShowModalPadre(false);
        setLoading(true);

        try {
            const filasResueltas = aplicarResolucionesPadre(
                filasPendientes,
                nuevasResoluciones,
            );

            const resultado = await enviarPlatosProduccion(filasResueltas);

            if (resultado.status === 'ok') {
                completarAltaExitosa(filasResueltas.length);
                resetResolucionPadre();
                return;
            }

            if (resultado.status === 'ambiguo') {
                iniciarResolucionPadre(filasResueltas, resultado.ambiguos);
                mostrarToast(
                    'warn',
                    'Falta seleccionar el plato padre para algunas filas',
                );
                return;
            }

            throw new Error('Error en producción');
        } catch {
            mostrarToast('error', 'Error al agregar platos');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validacion = obtenerFilasAEnviar();
        if (!validacion.ok) {
            mostrarToast('warn', validacion.error);
            return;
        }

        setLoading(true);

        try {
            if (produccion) {
                const resultado = await enviarPlatosProduccion(validacion.filas);

                if (resultado.status === 'ambiguo') {
                    iniciarResolucionPadre(validacion.filas, resultado.ambiguos);
                    mostrarToast(
                        'warn',
                        'Selecciona el plato padre para continuar',
                    );
                    return;
                }

                if (resultado.status === 'error') {
                    throw new Error('Error en producción');
                }
            } else {
                const responses = await Promise.all(
                    validacion.filas.map((fila) =>
                        fetch('/api/platos', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(fila),
                        }),
                    ),
                );

                if (responses.some((response) => !response.ok)) {
                    throw new Error('Error al agregar platos');
                }
            }

            completarAltaExitosa(validacion.filas.length);
        } catch {
            mostrarToast('error', 'Error al agregar platos');
        } finally {
            setLoading(false);
        }
    };

    const opciones = platos.map((plato) => ({
        value: String(plato.codigo),
        label: `${plato.codigo} - ${plato.nombreProducto}`,
    }));

    const obtenerNombrePlato = (codigo: string) => {
        const plato = platos.find((item) => String(item.codigo) === codigo);
        return plato?.nombreProducto || codigo;
    };

    if (loading) {
        return (
            <>
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
                        speedMultiplier={0.5}
                    />
                </div>
            </>
        );
    }

    return (
        <Container>
            {mounted && (
                <ToastContainer
                    position="bottom-right"
                    autoClose={5000}
                    limit={5000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="colored"
                    transition={Slide}
                />
            )}
            <Form onSubmit={handleSubmit}>
                {filasPlatos.map((fila, index) => (
                    <div
                        key={fila.id}
                        className={index > 0 ? 'mt-3 pt-3 border-top' : ''}>
                        <Row className="g-3 align-items-end">
                            <Col xs={12} md={4}>
                                <Form.Group controlId={`plato-${fila.id}`}>
                                    <Form.Label>Plato</Form.Label>
                                    {client && (
                                        <Select
                                            options={opciones}
                                            value={opciones.find(
                                                (o) => o.value === fila.platoCodigo,
                                            )}
                                            isClearable={true}
                                            onChange={(opcion) =>
                                                actualizarFila(fila.id, {
                                                    platoCodigo:
                                                        opcion?.value || '',
                                                })
                                            }
                                            placeholder="Selecciona o busca un plato..."
                                            isSearchable={true}
                                            styles={{
                                                menu: (provided) => ({
                                                    ...provided,
                                                    zIndex: 9999,
                                                }),
                                            }}
                                        />
                                    )}
                                </Form.Group>
                            </Col>
                            <Col xs={12} md={3}>
                                <Form.Group controlId={`cantidad-${fila.id}`}>
                                    <Form.Label>Cantidad</Form.Label>
                                    <Form.Control
                                        type="number"
                                        step="any"
                                        min="0.01"
                                        placeholder="Ingresa la cantidad"
                                        value={fila.cantidad}
                                        onChange={(e) =>
                                            actualizarFila(fila.id, {
                                                cantidad: e.target.value,
                                            })
                                        }
                                    />
                                </Form.Group>
                            </Col>
                            <Col xs={12} md={3}>
                                <Form.Group controlId={`fecha-${fila.id}`}>
                                    <Row>
                                        <Col>
                                            <Form.Label
                                                style={{ display: 'block' }}>
                                                Fecha
                                            </Form.Label>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            <DatePicker
                                                className="form-control w-100"
                                                selected={fila.fecha}
                                                locale={es}
                                                dateFormat={'dd-MM-yyyy'}
                                                onChange={(date) => {
                                                    if (date) {
                                                        actualizarFila(fila.id, {
                                                            fecha: date,
                                                        });
                                                    }
                                                }}
                                            />
                                        </Col>
                                    </Row>
                                </Form.Group>
                            </Col>
                            <Col xs={12} md={2}>
                                <Form.Group controlId={`acciones-${fila.id}`}>
                                    <Form.Label
                                        style={{ display: 'block' }}>
                                        Acciones
                                    </Form.Label>
                                    <div className="d-flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline-primary"
                                            onClick={agregarFila}>
                                            +
                                        </Button>
                                        {filasPlatos.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="outline-danger"
                                                onClick={() =>
                                                    eliminarFila(fila.id)
                                                }>
                                                -
                                            </Button>
                                        )}
                                    </div>
                                </Form.Group>
                            </Col>
                        </Row>
                    </div>
                ))}

                <Row className="mt-3">
                    <Col>
                        <Button
                            variant="success"
                            style={{ margin: '0 auto', display: 'block' }}
                            type="submit">
                            {filasPlatos.length > 1
                                ? 'Agregar Platos'
                                : 'Agregar Plato'}
                        </Button>
                    </Col>
                </Row>
            </Form>

            <Modal
                show={showModalPadre}
                onHide={cancelarResolucionPadre}
                backdrop="static"
                keyboard={false}
                centered>
                <Modal.Header closeButton>
                    <Modal.Title>Seleccionar Plato Padre</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {ambiguedadActual ? (
                        <>
                            <p className="mb-2">
                                El plato seleccionado tiene más de un plato
                                padre en recetas.
                            </p>
                            <p className="mb-1">
                                <strong>Fila:</strong> {indiceAmbiguedad + 1} de{' '}
                                {ambiguedadesPendientes.length}
                            </p>
                            <p className="mb-1">
                                <strong>Plato:</strong>{' '}
                                {ambiguedadActual.platoCodigo} -{' '}
                                {obtenerNombrePlato(
                                    ambiguedadActual.platoCodigo,
                                )}
                            </p>
                            <p className="mb-3">
                                <strong>Fecha / Cantidad:</strong>{' '}
                                {ambiguedadActual.fecha} /{' '}
                                {ambiguedadActual.cantidad}
                            </p>

                            <Form>
                                {ambiguedadActual.padres.map((padre) => (
                                    <Form.Check
                                        key={`${padre.codigo}-${padre.nombre}`}
                                        type="radio"
                                        name="padre-opcion"
                                        id={`padre-${padre.codigo}`}
                                        label={`${padre.codigo} - ${padre.nombre}`}
                                        checked={
                                            padreSeleccionadoActual === padre.codigo
                                        }
                                        onChange={() => {
                                            setPadreSeleccionadoActual(
                                                padre.codigo,
                                            );
                                        }}
                                        className="mb-2"
                                    />
                                ))}
                            </Form>
                        </>
                    ) : (
                        <p>No hay filas ambiguas pendientes.</p>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={cancelarResolucionPadre}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        disabled={!ambiguedadActual || !padreSeleccionadoActual}
                        onClick={() => {
                            void confirmarSeleccionPadre();
                        }}>
                        Confirmar
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}
