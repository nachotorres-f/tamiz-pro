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
    const [selectedPlato, setSelectedPlato] = useState<string>('');
    const [cantidad, setCantidad] = useState<string>('');
    const [startDate, setStartDate] = useState(new Date());
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

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!selectedPlato || !cantidad) {
            setLoading(false);
            setMounted(true);
            toast.warn('Completa todos los campos', {
                position: 'bottom-right',
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: 'colored',
                transition: Slide,
            });
            setTimeout(() => {
                setMounted(false);
            }, 5000);
            return;
        }

        setLoading(true);

        if (produccion) {
            fetch('api/produccion/plato', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    plato: selectedPlato.split('-')[0],
                    cantidad: parseFloat(cantidad).toFixed(2),
                    fecha: startDate.toISOString(),
                    salon,
                }),
            })
                .then((res) => res.json())
                .then(() => {
                    setSemanaBase(new Date());
                })
                .catch(() => {
                    toast.error('Completa todos los campos', {
                        position: 'bottom-right',
                        autoClose: 5000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        progress: undefined,
                        theme: 'colored',
                        transition: Slide,
                    });
                })
                .finally(() => {
                    setLoading(false);
                    setSelectedPlato('');
                    setCantidad('');
                    setStartDate(new Date());
                });
        } else {
            fetch('/api/platos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    plato: selectedPlato.split('-')[0],
                    cantidad: parseFloat(cantidad).toFixed(2),
                    fecha: startDate.toISOString(),
                }),
            })
                .then((res) => res.json())
                .then(() => {
                    setSemanaBase(new Date());
                })
                .catch(() => {
                    toast.error('Completa todos los campos', {
                        position: 'bottom-right',
                        autoClose: 5000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        progress: undefined,
                        theme: 'colored',
                        transition: Slide,
                    });
                })
                .finally(() => {
                    setLoading(false);
                    setSelectedPlato('');
                    setCantidad('');
                    setStartDate(new Date());
                });
        }
    };

    const opciones = platos.map((plato) => ({
        value: plato.nombreProducto,
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
                <Row>
                    <Col xs={3}>
                        <Form.Group controlId="plato">
                            <Form.Label>Plato</Form.Label>
                            {client && (
                                <Select
                                    options={opciones}
                                    value={opciones.find(
                                        (o) => o.value === selectedPlato
                                    )}
                                    onChange={(opcion) =>
                                        setSelectedPlato(opcion?.value || '')
                                    }
                                    placeholder="Selecciona o busca un plato..."
                                    isSearchable={true} // ya viene por defecto, pero lo aclaramos
                                    styles={{
                                        menu: (provided) => ({
                                            ...provided,
                                            zIndex: 9999, // por si hay problemas de superposición
                                        }),
                                    }}
                                />
                            )}
                            {/* <Form.Select
                                value={selectedPlato}
                                onChange={(e) =>
                                    setSelectedPlato(e.target.value)
                                }>
                                <option
                                    value=""
                                    disabled>
                                    Selecciona un plato
                                </option>
                                {platos.map((plato) => (
                                    <option
                                        key={
                                            plato.codigo +
                                            '-' +
                                            plato.nombreProducto
                                        }
                                        value={plato.nombreProducto}>
                                        {plato.codigo +
                                            ' - ' +
                                            plato.nombreProducto}
                                    </option>
                                ))}
                            </Form.Select> */}
                        </Form.Group>
                    </Col>
                    <Col xs={3}>
                        <Form.Group controlId="cantidad">
                            <Form.Label>Cantidad</Form.Label>
                            <Form.Control
                                type="number"
                                step="any"
                                placeholder="Ingresa la cantidad"
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col xs={3}>
                        <Form.Group controlId="fecha">
                            <Row>
                                <Col>
                                    <Form.Label style={{ display: 'block' }}>
                                        Fecha
                                    </Form.Label>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <DatePicker
                                        className="form-control w-100"
                                        selected={startDate}
                                        locale={es}
                                        dateFormat={'dd-MM-yyyy'}
                                        onChange={(date) => {
                                            if (date) setStartDate(date);
                                        }}
                                    />
                                </Col>
                            </Row>
                        </Form.Group>
                    </Col>
                    <Col xs={3}>
                        <Button
                            variant="success"
                            style={{ margin: '2rem auto', display: 'block' }}
                            type="submit">
                            Agregar Plato
                        </Button>
                    </Col>
                </Row>
            </Form>
        </Container>
    );
}
