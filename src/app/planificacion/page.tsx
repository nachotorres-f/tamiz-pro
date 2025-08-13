/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
    useEffect,
    //  useRef,
    useState,
} from 'react';
import {
    Button,
    Col,
    Container,
    Form,
    Row,
    // Form
} from 'react-bootstrap';
// import Row from 'react-bootstrap/Row';
// import Col from 'react-bootstrap/Col';
import { addDays, startOfWeek } from 'date-fns';
import React from 'react';
// import { FiltroPlatos } from '@/components/filtroPlatos';
// import { SelectorDias } from '@/components/selectorDias';
import { NavegacionSemanal } from '@/components/navegacionSemanal';
import { TablaPlanificacion } from '@/components/tablaPlanificacion';
import TablaEventosPlanificacion from '@/components/tablaEventosPlanificacion';
import AgregarPlato from '@/components/agregarPlato';
import { MoonLoader } from 'react-spinners';
import { Slide, toast, ToastContainer } from 'react-toastify';

export default function PlanificacionPage() {
    const [semanaBase, setSemanaBase] = useState(new Date());
    const [diasSemana, setDiasSemana] = useState<Date[]>([]);
    const [datos, setDatos] = useState<any[]>([]);
    const [produccion, setProduccion] = useState<any[]>([]);
    const [datosFiltrados, setDatosFiltrados] = useState<any[]>([]);
    // const [filtro, setFiltro] = useState('');
    const [filtro] = useState('');
    const [diaActivo, setDiaActivo] = useState('');
    const [platoExpandido, setPlatoExpandido] = useState<string | null>(null);
    const [filtroSalon, setFiltroSalon] = useState<string | null>('A');
    const [produccionUpdate, setProduccionUpdate] = React.useState<any[]>([]);
    const [loading, setLoading] = useState(false);

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
                startOfWeek(semanaBase, { weekStartsOn: 1 }).toISOString() +
                '&salon=' +
                (filtroSalon || 'A')
        ) // jueves
            .then((res) => res.json())
            .then((data) => {
                setDatos(data.planifacion || []);
                setProduccion(data.produccion || []);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [semanaBase, filtroSalon]);

    useEffect(() => {
        const inicioSemana = startOfWeek(semanaBase, { weekStartsOn: 4 }); // jueves
        const dias = Array.from({ length: 13 }, (_, i) =>
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
                salon: filtroSalon,
                produccion: produccionUpdate,
            }),
        })
            .then(() => {
                toast.success('Produccion actualizada', {
                    position: 'bottom-right',
                    theme: 'colored',
                    transition: Slide,
                });
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
                startOfWeek(semanaBase, {
                    weekStartsOn: 1,
                }).toISOString()
        ) // jueves
            .then((res) => res.json())
            .then((data) => {
                setDatos(data.planifacion || []);
                setProduccion(data.produccion || []);
            })
            .finally(() => {});
    };

    const platosUnicos = [...new Set(datosFiltrados.map((d) => d.plato))];

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
        <div>
            <ToastContainer />
            <Container className="mt-5 flex-grow-1">
                <h2 className="text-center mb-4">Planificación</h2>

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

                <Container className="mb-3">
                    <Row>
                        <Col xs={4}>
                            <Form.Group>
                                <Form.Label>Filtrar por salón</Form.Label>
                                <Form.Select
                                    value={filtroSalon || ''}
                                    onChange={(e) =>
                                        setFiltroSalon(e.target.value)
                                    }>
                                    <option value="A">
                                        Rut Haus - Origami
                                    </option>
                                    <option value="B">
                                        El Central - La Rural
                                    </option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                </Container>

                <TablaEventosPlanificacion
                    diasSemana={diasSemana}
                    diaActivo={diaActivo}
                    filtroSalon={filtroSalon}
                    // anchoColumna={anchoButton + anchoPlato + anchoTotal}
                />

                <NavegacionSemanal
                    semanaBase={semanaBase}
                    setSemanaBase={setSemanaBase}
                />

                <Button
                    type="button"
                    className="btn btn-success mb-3"
                    onClick={handleGuardarProduccion}>
                    Guardar Cambios
                </Button>
            </Container>

            <div
                className="mb-3"
                style={{ overflow: 'auto', height: '80vh' }}>
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
                    // anchoButton={anchoButton}
                    // anchoPlato={anchoPlato}
                    // anchoTotal={anchoTotal}
                />
            </div>

            <Container>
                <AgregarPlato setSemanaBase={setSemanaBase} />
            </Container>
        </div>
    );
}
