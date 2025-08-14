/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
    useEffect,
    //  useRef,
    useState,
} from 'react';
import {
    Container,
    // Form
} from 'react-bootstrap';
// import Row from 'react-bootstrap/Row';
// import Col from 'react-bootstrap/Col';
import { addDays, startOfWeek } from 'date-fns';
import React from 'react';
// import { FiltroPlatos } from '@/components/filtroPlatos';
// import { SelectorDias } from '@/components/selectorDias';
import { NavegacionSemanal } from '@/components/navegacionSemanal';
// import { TablaPlanificacion } from '@/components/tablaPlanificacion';
import { TablaEntregaMP } from '@/components/tablaEntregaMP';
//import TablaEventosPlanificacion from '@/components/tablaEventosPlanificacion';

export default function EntregaMPPage() {
    const [semanaBase, setSemanaBase] = useState(new Date());
    const [diasSemana, setDiasSemana] = useState<Date[]>([]);
    const [datos, setDatos] = useState<any[]>([]);
    // const [filtro, setFiltro] = useState('');
    // const [diaActivo, setDiaActivo] = useState('');
    const [platoExpandido, setPlatoExpandido] = useState<string | null>(null);

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
        fetch('/api/entregaMP')
            .then((res) => res.json())
            .then((data) => {
                return data;
            })
            .then(setDatos);
    }, []);

    useEffect(() => {
        const inicioSemana = startOfWeek(semanaBase, { weekStartsOn: 1 }); // lunes
        const dias = Array.from({ length: 7 }, (_, i) =>
            addDays(inicioSemana, i)
        );
        setDiasSemana(dias);
        // setDiaActivo('');
    }, [semanaBase]);

    const platosUnicos = [
        ...new Set(
            datos
                .filter((d) =>
                    diasSemana.some((dia) => {
                        const fechaDato = new Date(d.fecha);
                        return (
                            fechaDato.getFullYear() === dia.getFullYear() &&
                            fechaDato.getMonth() === dia.getMonth() &&
                            fechaDato.getDate() === dia.getDate()
                        );
                    })
                )
                .map((d) => d.plato)
        ),
    ];

    return (
        <Container className="mt-5">
            <h2 className="text-center mb-4">Entrega MP</h2>

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

            {/* eventos */}

            {/*             
            <TablaEventosPlanificacion
                diasSemana={diasSemana}
                diaActivo={diaActivo}
                // anchoColumna={anchoButton + anchoPlato + anchoTotal}
            />
            */}

            <NavegacionSemanal
                semanaBase={semanaBase}
                setSemanaBase={setSemanaBase}
            />

            <TablaEntregaMP
                platosUnicos={platosUnicos}
                // diasSemana={diasSemana}
                // datos={datos}
                // filtro={filtro}
                // diaActivo={diaActivo}
                platoExpandido={platoExpandido}
                setPlatoExpandido={setPlatoExpandido}
                pageOcultos={false}
                datos={datos}
                // anchoButton={anchoButton}
                // anchoPlato={anchoPlato}
                // anchoTotal={anchoTotal}
            />
        </Container>
    );
}
