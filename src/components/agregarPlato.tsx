'use client';

import React, { useEffect, useState } from 'react';
import { Button, Col, Container, Form, Row } from 'react-bootstrap';
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

const crearFilaPlato = (fecha?: Date): FilaPlato => ({
    id: Date.now() + Math.floor(Math.random() * 10000),
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

export default function AgregarPlato({
    salon,
    produccion,
    setSemanaBase,
}: {
    salon: string;
    produccion: boolean;
    setSemanaBase: (date: Date) => void;
}) {
    const [platos, setPlatos] = useState<Plato[]>([]);
    const [filasPlatos, setFilasPlatos] = useState<FilaPlato[]>([
        crearFilaPlato(),
    ]);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [client, setIsClient] = useState(false);

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
            return [...prev, crearFilaPlato(ultimaFecha)];
        });
    };

    const eliminarFila = (id: number) => {
        setFilasPlatos((prev) => {
            const nuevasFilas = prev.filter((fila) => fila.id !== id);
            if (nuevasFilas.length === 0) {
                return [crearFilaPlato()];
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

    const obtenerFilasAEnviar = () => {
        const filasConDatos = filasPlatos.filter((fila) => {
            const tienePlato = fila.platoCodigo.trim() !== '';
            const tieneCantidad = fila.cantidad.trim() !== '';
            return tienePlato || tieneCantidad;
        });

        if (filasConDatos.length === 0) {
            return { error: 'Completa todos los campos' };
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
            return { error: 'Completa todos los campos' };
        }

        return {
            filas: filasConDatos.map((fila) => ({
                platoCodigo: fila.platoCodigo,
                cantidad: Number(fila.cantidad).toFixed(2),
                fecha: fila.fecha.toISOString(),
            })),
        };
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validacion = obtenerFilasAEnviar();
        if ('error' in validacion) {
            mostrarToast('warn', validacion.error);
            return;
        }

        setLoading(true);

        try {
            if (produccion) {
                const response = await fetch('api/produccion/plato', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        salon,
                        platos: validacion.filas,
                    }),
                });

                if (!response.ok) throw new Error('Error en producción');
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

            setSemanaBase(new Date());
            setFilasPlatos([crearFilaPlato()]);

            mostrarToast(
                'success',
                `${validacion.filas.length} plato${
                    validacion.filas.length > 1 ? 's' : ''
                } agregado${
                    validacion.filas.length > 1 ? 's' : ''
                } correctamente`,
            );
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

    if (loading) {
        return (
            <>
                {/* {mounted && (
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
                )} */}
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
                                                (o) =>
                                                    o.value ===
                                                    fila.platoCodigo,
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
                                                        actualizarFila(
                                                            fila.id,
                                                            {
                                                                fecha: date,
                                                            },
                                                        );
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
        </Container>
    );
}
