/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
    useEffect,
    //  useRef,
    useState,
} from 'react';
import {
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

export default function PlanificacionPage() {
    const [semanaBase, setSemanaBase] = useState(new Date());
    const [diasSemana, setDiasSemana] = useState<Date[]>([]);
    const [datos, setDatos] = useState<any[]>([]);
    const [datosFiltrados, setDatosFiltrados] = useState<any[]>([]);
    // const [filtro, setFiltro] = useState('');
    const [filtro] = useState('');
    const [diaActivo, setDiaActivo] = useState('');
    const [platoExpandido, setPlatoExpandido] = useState<string | null>(null);
    const [filtroSalon, setFiltroSalon] = useState<string | null>(null);

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
        fetch('/api/planificacion')
            .then((res) => res.json())
            .then((data) => {
                console.log('Datos de planificación:', data);
                return data;
            })
            .then(setDatos);
    }, []);

    useEffect(() => {
        const inicioSemana = startOfWeek(semanaBase, { weekStartsOn: 0 }); // domingo
        const dias = Array.from({ length: 7 }, (_, i) =>
            addDays(inicioSemana, i)
        );
        setDiasSemana(dias);
        setDiaActivo('');
    }, [semanaBase]);

    useEffect(() => {
        if (filtroSalon) {
            const datosFiltrados = datos.filter((d) => {
                if (filtroSalon === 'A') {
                    return filtroSalon === 'A'
                        ? d.lugar.toLowerCase() !== 'el central'
                        : d.lugar.toLowerCase() !== 'la rural';
                }

                if (filtroSalon === 'B') {
                    return filtroSalon === 'B'
                        ? d.lugar.toLowerCase() === 'el central'
                        : d.lugar.toLowerCase() === 'la rural';
                }
            });
            setDatosFiltrados(datosFiltrados);
        } else {
            setDatosFiltrados(datos);
        }
    }, [filtroSalon, datos]);

    const platosUnicos = [...new Set(datosFiltrados.map((d) => d.plato))];

    return (
        <Container className="mt-5">
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

            <AgregarPlato />

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
                                <option value="">Todos los salones</option>
                                <option value="A">Rut Haus - Origami</option>
                                <option value="B">El Central - La Rural</option>
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

            <div style={{ overflowX: 'auto', height: 'calc(100vh - 300px)' }}>
                <TablaPlanificacion
                    platosUnicos={platosUnicos}
                    diasSemana={diasSemana}
                    datos={datosFiltrados}
                    filtro={filtro}
                    diaActivo={diaActivo}
                    platoExpandido={platoExpandido}
                    setPlatoExpandido={setPlatoExpandido}
                    pageOcultos={false}
                    // anchoButton={anchoButton}
                    // anchoPlato={anchoPlato}
                    // anchoTotal={anchoTotal}
                />
            </div>
        </Container>
    );
}
