/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { NavegacionSemanal } from '@/components/navegacionSemanal';
import { addDays, format, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useContext, useEffect, useState } from 'react';
import { Button, Container, Modal, Table } from 'react-bootstrap';
import { FiletypePdf } from 'react-bootstrap-icons';
import { MoonLoader } from 'react-spinners';
import { SalonContext } from '@/components/filtroPlatos';
import { Slide, toast, ToastContainer } from 'react-toastify';
import { generarPDFReceta } from '@/lib/generarPDF';

export default function ProduccionPreviaPage() {
    const salon = useContext(SalonContext);

    //const [filtro, setFiltro] = useState('');
    const [filtro] = useState('');
    const [diasSemana, setDiasSemana] = useState<Date[]>([]);
    const [diaActivo, setDiaActivo] = useState('');
    const [semanaBase, setSemanaBase] = useState(new Date());
    const [datos, setDatos] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [filtroSalon, setFiltroSalon] = useState<string | null>('A');
    const [loading, setLoading] = useState(false);
    const [fechaImprimir, setFechaImprimir] = useState<Date | null>(null);

    useEffect(() => {
        if (salon) {
            setFiltroSalon(salon); // sincroniza el estado con el context
        }
    }, [salon]);

    useEffect(() => {
        setLoading(true);
        fetch(
            '/api/produccionPrevia?fechaInicio=' +
                startOfWeek(semanaBase, { weekStartsOn: 1 }).toISOString()
        )
            .then((res) => res.json())
            .then((res) => res.data)
            .then(setDatos)
            .finally(() => {
                setLoading(false);
            });
    }, [semanaBase]);

    useEffect(() => {
        const inicioSemana = addDays(
            startOfWeek(semanaBase, { weekStartsOn: 1 }),
            -4
        ); // jueves
        const dias = Array.from({ length: 13 }, (_, i) =>
            addDays(inicioSemana, i)
        );
        setDiasSemana(dias);
        setDiaActivo('');
    }, [semanaBase]);

    const filterDias = (dia: Date) => {
        if (diaActivo && format(dia, 'yyyy-MM-dd') !== diaActivo) {
            return false;
        }

        return true;
    };

    const filterPlatos = (dato: any) => {
        if (!filtro) return true;

        return dato.plato.toLowerCase().includes(filtro.toLowerCase());
    };

    const generarPDF = (modo: 'unico' | 'separado') => {
        toast.info('Imprimiendo recetas', {
            position: 'bottom-right',
            theme: 'colored',
            transition: Slide,
        });

        generarPDFReceta(
            [],
            fechaImprimir || new Date(),
            filtroSalon || 'A',
            modo,
            true
        );

        handleClose();
    };

    const handleClose = () => setShowModal(false);

    const filterSalon = (dato: any) => {
        if (!filtroSalon) return true;

        return dato.salon === filtroSalon;
    };

    const formatFecha = (dia: Date) => {
        const nombreDia = format(dia, 'EEEE', { locale: es }); // "lunes"
        const letraDia = nombreDia.startsWith('mi')
            ? 'X'
            : nombreDia.charAt(0).toUpperCase(); // "L"
        const diaNumero = format(dia, 'd'); // "5"
        const mesNumero = format(dia, 'M'); // "8"
        return `${letraDia} ${diaNumero}-${mesNumero}`;
    };

    if (loading) {
        return (
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
                    size={100}
                    speedMultiplier={0.5}
                />
            </div>
        );
    }

    return (
        <>
            <Container className="mt-5">
                <h2 className="text-center mb-4">Entrega de MP</h2>

                <ToastContainer />
                <Modal
                    show={showModal}
                    onHide={handleClose}>
                    <Modal.Header closeButton>
                        <Modal.Title>Imprimir recetas</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        ¿Quieres imprimir las recetas separadas o juntas?
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="primary"
                            onClick={() => {
                                generarPDF('unico');
                            }}>
                            Imprimir juntas
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => {
                                generarPDF('separado');
                            }}>
                            Imprimir separadas
                        </Button>
                    </Modal.Footer>
                </Modal>

                <NavegacionSemanal
                    semanaBase={semanaBase}
                    setSemanaBase={setSemanaBase}
                />
            </Container>

            <div
                className="mt-3 mx-auto"
                style={{
                    overflowY: 'auto',
                    height: '100vh',
                    width: '100%',
                }}>
                <Table
                    bordered
                    striped
                    id="tabla-produccion">
                    <thead className="table-dark sticky-top">
                        <tr style={{ textAlign: 'center' }}>
                            <th></th>
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                                (i) => {
                                    return (
                                        <th key={i}>
                                            <Button
                                                className="btn-danger"
                                                size="sm"
                                                style={{
                                                    width: '2rem',
                                                    height: '2rem',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    margin: '0 auto',
                                                }}
                                                onClick={() => {
                                                    setFechaImprimir(
                                                        addDays(
                                                            diasSemana[i],
                                                            2
                                                        )
                                                    );
                                                    setShowModal(true);
                                                }}>
                                                <FiletypePdf />
                                            </Button>
                                        </th>
                                    );
                                }
                            )}
                        </tr>
                        <tr style={{ textAlign: 'center' }}>
                            <th>Plato</th>
                            {diasSemana.filter(filterDias).map((dia, idx) => (
                                <th key={idx}>{formatFecha(dia)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {datos &&
                            datos
                                .filter(filterPlatos)
                                .filter(filterSalon)
                                .map((dato) => (
                                    <tr key={dato.plato}>
                                        <td>{dato.plato}</td>

                                        {diasSemana
                                            .filter(filterDias)
                                            .map((dia, i) => {
                                                dia.setHours(0, 0, 0, 0);

                                                const produccion =
                                                    dato.produccion.find(
                                                        (prod: any) => {
                                                            const fecha =
                                                                new Date(
                                                                    prod.fecha
                                                                );
                                                            fecha.setHours(
                                                                0,
                                                                0,
                                                                0,
                                                                0
                                                            );

                                                            return (
                                                                fecha.getTime() ===
                                                                dia.getTime()
                                                            );
                                                        }
                                                    );
                                                const cantidad = produccion
                                                    ? produccion.cantidad
                                                    : 0;
                                                return (
                                                    <td
                                                        key={i}
                                                        className="link-pdf"
                                                        onClick={() => {
                                                            toast.info(
                                                                'Imprimiendo receta',
                                                                {
                                                                    position:
                                                                        'bottom-right',
                                                                    theme: 'colored',
                                                                    transition:
                                                                        Slide,
                                                                }
                                                            );

                                                            generarPDFReceta(
                                                                [dato.plato],
                                                                addDays(dia, 2),
                                                                filtroSalon ||
                                                                    'A',
                                                                'separado',
                                                                true
                                                            );
                                                        }}>
                                                        {cantidad || ''}
                                                    </td>
                                                );
                                            })}
                                    </tr>
                                ))}
                    </tbody>
                </Table>
            </div>
        </>
    );
}
