/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { Container, Form } from 'react-bootstrap';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { addDays, startOfWeek } from 'date-fns';
import React from 'react';
import { FiltroPlatos } from '@/components/filtroPlatos';
import { SelectorDias } from '@/components/selectorDias';
import { NavegacionSemanal } from '@/components/navegacionSemanal';
import { TablaPlanificacion } from '@/components/tablaPlanificacion';

export default function PlanificacionPage() {
    const [semanaBase, setSemanaBase] = useState(new Date());
    const [diasSemana, setDiasSemana] = useState<Date[]>([]);
    const [datos, setDatos] = useState<any[]>([]);
    const [filtro, setFiltro] = useState('');
    const [diaActivo, setDiaActivo] = useState('');
    const [platoExpandido, setPlatoExpandido] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/planificacion')
            .then((res) => res.json())
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

    const platosUnicos = [...new Set(datos.map((d) => d.plato))];

    return (
        <Container className="mt-5">
            <h2 className="text-center mb-4">Ocultos</h2>

            <Form.Group>
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
            </Form.Group>

            <NavegacionSemanal
                semanaBase={semanaBase}
                setSemanaBase={setSemanaBase}
            />

            <TablaPlanificacion
                pageOcultos={true}
                platosUnicos={platosUnicos}
                diasSemana={diasSemana}
                datos={datos}
                filtro={filtro}
                diaActivo={diaActivo}
                platoExpandido={platoExpandido}
                setPlatoExpandido={setPlatoExpandido}
            />
        </Container>
    );
}
