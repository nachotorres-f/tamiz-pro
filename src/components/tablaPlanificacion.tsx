/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useContext, useEffect, useState } from 'react';
import {
    Button,
    FloatingLabel,
    Form,
    Modal,
    OverlayTrigger,
    Table,
    Tooltip,
} from 'react-bootstrap';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlatoDetalle } from './platoDetalle';
import { ChatRightText } from 'react-bootstrap-icons';
import { EventoPlanificacion } from '@/app/planificacion/page';
import { RolContext } from './filtroPlatos';

export function TablaPlanificacion({
    pageOcultos,
    platosUnicos,
    diasSemana,
    datos,
    filtro,
    diaActivo,
    platoExpandido,
    produccion,
    produccionUpdate,
    observaciones,
    eventos,
    maxCantidadEventosDia,
    setObservaciones,
    setProduccionUpdate,
    setEventoAdelantado,
}: // anchoButton,
// anchoPlato,
// anchoTotal,
{
    pageOcultos: boolean;
    platosUnicos: { plato: string; platoPadre: string }[];
    diasSemana: Date[];
    datos: any[];
    filtro: string;
    diaActivo: string;
    platoExpandido: string | null;
    produccion: any[];
    produccionUpdate: any[];
    observaciones: { plato: string; observacion: string; platoPadre: string }[];
    eventos: EventoPlanificacion[];
    maxCantidadEventosDia: number;
    setObservaciones: (
        value: { plato: string; observacion: string; platoPadre: string }[]
    ) => void;
    setProduccion: (value: any[]) => void;
    setProduccionUpdate: (value: any[]) => void;
    // anchoButton: any;
    // anchoPlato: any;
    // anchoTotal: any;
    setPlatoExpandido: (value: string | null) => void;
    setEventoAdelantado: (value: number) => void;
}) {
    const RolProvider = useContext(RolContext);

    const [ocultos, setOcultos] = React.useState<Set<string>>(new Set());
    const [show, setShow] = useState(false);
    const [platoModal, setPlatoModal] = useState('');
    const [platoPadreModal, setPlatoPadreModal] = useState('');
    const [observacionModal, setObservacionModal] = useState('');
    const [adelantarEvento, setAdelantarEvento] = useState(0);
    const [platosAdelantados, setPlatosAdelantados] = useState<any[]>([]);
    //const [primeraCargaModal, setPrimeraCargaModal] = useState(true);

    useEffect(() => {
        fetch('/api/ocultos')
            .then((res) => res.json())
            .then((ocultosDB) => setOcultos(new Set(ocultosDB)));
    }, []);

    // const ocultarPlato = async (plato: string) => {
    //     await fetch('/api/ocultos', {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify({ plato }),
    //     });
    //     setOcultos(new Set([...ocultos, plato]));
    // };

    // const mostrarPlato = async (plato: string) => {
    //     await fetch(`/api/ocultos?plato=${encodeURIComponent(plato)}`, {
    //         method: 'DELETE',
    //     });
    //     const nuevos = new Set(ocultos);
    //     nuevos.delete(plato);
    //     setOcultos(nuevos);
    // };

    const filterPlatos = ({ plato }: { plato: string }) => {
        if (pageOcultos) {
            if (ocultos.has(plato)) {
                return true;
            }
            return false;
        }

        // Si el plato está oculto y no es la página de ocultos, no lo mostramos
        if (ocultos.has(plato)) return false;

        if (!filtro) return true;

        return plato.toLowerCase().includes(filtro.toLowerCase());
    };

    const abreviar = (lugar: string) => {
        if (lugar === 'El Central') return 'CEN';
        if (lugar === 'La Rural') return 'RUR';
        if (lugar === 'Rüt Haus') return 'RUT';
        if (lugar === 'Origami') return 'ORI';
    };

    const filterDias = (dia: Date) => {
        if (diaActivo && format(dia, 'yyyy-MM-dd') !== diaActivo) {
            return false;
        }
        return true;
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
    const handleClose = () => setShow(false);

    const handleVerticalScrollLeft = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        const rigthTable = document.getElementById(
            'right-table'
        ) as HTMLElement;
        if (rigthTable) {
            rigthTable.scrollTop = scrollTop;
        }
    };

    const handleVerticalScrollRight = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;

        const leftTable = document.getElementById('left-table') as HTMLElement;

        // if (!isSyncingScroll) {
        //     isSyncingScroll = true;

        //     if (fakeScroll) {
        //         fakeScroll.scrollLeft = scrollLeft;
        //     }

        //     requestAnimationFrame(() => {
        //         isSyncingScroll = false;
        //     });
        // }

        if (leftTable) {
            leftTable.scrollTop = scrollTop;
        }
    };

    useEffect(() => {
        if (adelantarEvento == 0) return;

        fetch(`/api/planificacion/adelantarEvento?id=${adelantarEvento}`)
            .then((res) => res.json())
            .then((data) => {
                setPlatosAdelantados(data.Plato);
            })
            .catch((error) => {
                console.error('Error al adelantar el evento:', error);
            });
    }, [adelantarEvento]);

    const handleCloseAdelantar = () => {
        setEventoAdelantado(Math.random());
        setAdelantarEvento(0);
        setPlatosAdelantados([]);
    };

    const heightTd = '3rem';
    const styleTd = {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        verticalAlign: 'middle',
        height: heightTd,
        left: 0,
        width: '2rem',
        maxWidth: '15rem',
    };
    const styleEventos = {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        verticalAlign: 'middle',
        height: '3rem',
        width: '12rem',
    };

    return (
        <>
            <Modal
                show={show}
                onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        Observacion - {platoModal} - {platoPadreModal}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <FloatingLabel
                        controlId="floatingTextarea"
                        label="Observación"
                        className="mb-3">
                        <Form.Control
                            as="textarea"
                            value={observacionModal}
                            onChange={(
                                e: React.ChangeEvent<
                                    HTMLInputElement | HTMLTextAreaElement
                                >
                            ) => {
                                setObservacionModal(e.target.value);
                            }}
                            style={{ height: '200px' }}
                        />
                    </FloatingLabel>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setObservacionModal('');
                            handleClose();
                        }}>
                        Cerrar
                    </Button>
                    {RolProvider !== 'consultor' && (
                        <Button
                            variant="primary"
                            onClick={() => {
                                const obsExistente = observaciones.find(
                                    (o) =>
                                        o.plato === platoModal &&
                                        o.platoPadre === platoPadreModal
                                );
                                if (obsExistente) {
                                    obsExistente.observacion = observacionModal;
                                    setObservaciones([
                                        ...observaciones.filter(
                                            (o) =>
                                                o.plato !== platoModal &&
                                                o.platoPadre !== platoPadreModal
                                        ),
                                        obsExistente,
                                    ]);
                                } else {
                                    setObservaciones([
                                        ...observaciones,
                                        {
                                            plato: platoModal,
                                            platoPadre: platoPadreModal,
                                            observacion: observacionModal,
                                        },
                                    ]);
                                }
                                setObservacionModal('');
                                handleClose();
                            }}>
                            Guardar Cambios
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>

            <Modal
                size="lg"
                show={adelantarEvento != 0}
                onHide={() => handleCloseAdelantar()}>
                <Modal.Header closeButton>
                    <Modal.Title>Adelantar Plato Evento</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {platosAdelantados.length > 0 ? (
                        <Table>
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Cantidad</th>
                                    <th>Adelantar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {platosAdelantados.map((plato) => (
                                    <tr key={plato.id}>
                                        <td>{plato.nombre}</td>
                                        <td>{plato.cantidad}</td>
                                        <td>
                                            <Form.Check
                                                type="checkbox"
                                                checked={!!plato.fecha}
                                                onChange={(e) => {
                                                    const platoExistente =
                                                        platosAdelantados.find(
                                                            (p) =>
                                                                p.id ===
                                                                plato.id
                                                        );
                                                    if (platoExistente) {
                                                        platoExistente.fecha = e
                                                            .target.checked
                                                            ? new Date()
                                                            : null;
                                                        setPlatosAdelantados([
                                                            ...platosAdelantados.filter(
                                                                (p) =>
                                                                    p.id !==
                                                                    plato.id
                                                            ),
                                                            platoExistente,
                                                        ]);
                                                    }

                                                    fetch(
                                                        `/api/planificacion/adelantarEvento`,
                                                        {
                                                            method: 'POST',
                                                            headers: {
                                                                'Content-Type':
                                                                    'application/json',
                                                            },
                                                            body: JSON.stringify(
                                                                {
                                                                    id: plato.id,
                                                                    adelantar:
                                                                        e.target
                                                                            .checked,
                                                                }
                                                            ),
                                                        }
                                                    );
                                                }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <p>No hay platos</p>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            handleCloseAdelantar();
                        }}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>

            <div
                style={{
                    display: 'flex',
                    maxHeight: '90vh',
                }}>
                <div
                    id="left-table"
                    className="no-scrollbar"
                    style={{
                        flexShrink: 0,
                        // borderCollapse: 'collapse',
                        overflow: 'auto',
                        position: 'sticky',
                        left: 0,
                        zIndex: 3,
                    }}
                    onScroll={handleVerticalScrollLeft}>
                    <Table
                        style={{
                            width: 'max-content',
                            borderCollapse: 'collapse',
                        }}
                        className="mx-auto"
                        size="sm"
                        bordered
                        striped>
                        <thead className="sticky-top">
                            {Array.from({ length: maxCantidadEventosDia }).map(
                                (_, index) => (
                                    <tr
                                        key={`spacer-${index}`}
                                        style={{
                                            ...styleEventos,
                                        }}>
                                        {Array.from({ length: 4 }).map(
                                            (_, i) => (
                                                <td
                                                    key={i}
                                                    style={{
                                                        ...styleTd,
                                                    }}>
                                                    &nbsp;
                                                </td>
                                            )
                                        )}
                                    </tr>
                                )
                            )}
                            <tr
                                className="table-dark"
                                style={{
                                    textAlign: 'center',
                                    width: 'max-content',
                                }}>
                                <th
                                    style={{
                                        position: 'sticky',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        verticalAlign: 'middle',
                                        height: '100%',
                                        width: 'max-content',
                                        top: 0,
                                        zIndex: 4,
                                    }}></th>
                                <th
                                    style={{
                                        position: 'sticky',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        verticalAlign: 'middle',
                                        height: '100%',
                                        top: 0,
                                        zIndex: 4,
                                    }}>
                                    Plato
                                </th>
                                <th
                                    style={{
                                        position: 'sticky',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        verticalAlign: 'middle',
                                        height: '100%',
                                        top: 0,
                                        zIndex: 4,
                                    }}>
                                    Elaboracion
                                </th>
                                <th
                                    style={{
                                        position: 'sticky',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        verticalAlign: 'middle',
                                        height: '100%',
                                        top: 0,
                                        zIndex: 4,
                                    }}>
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {platosUnicos
                                .filter(filterPlatos)
                                .map(({ plato, platoPadre }) => (
                                    <React.Fragment key={plato + platoPadre}>
                                        <tr style={{ textAlign: 'center' }}>
                                            <td style={styleTd}>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    style={{
                                                        width: '2rem',
                                                        height: '2.2rem',
                                                        display: 'flex',
                                                        justifyContent:
                                                            'center',
                                                        alignItems: 'center',
                                                    }}
                                                    onClick={() => {
                                                        const observacion =
                                                            observaciones.find(
                                                                (o) =>
                                                                    o.plato ===
                                                                        plato &&
                                                                    o.platoPadre ===
                                                                        platoPadre
                                                            )?.observacion ||
                                                            observacionModal;

                                                        if (observacion) {
                                                            setObservacionModal(
                                                                observacion
                                                            );
                                                        } else {
                                                            const prod =
                                                                produccion.filter(
                                                                    (p) =>
                                                                        p.plato ===
                                                                            plato &&
                                                                        p.platoPadre ===
                                                                            platoPadre &&
                                                                        p.observacion
                                                                );

                                                            if (
                                                                prod.length > 0
                                                            ) {
                                                                setObservacionModal(
                                                                    prod[0]
                                                                        .observacion
                                                                );
                                                            } else {
                                                                setObservacionModal(
                                                                    ''
                                                                );
                                                            }
                                                        }

                                                        setPlatoModal(plato);
                                                        setPlatoPadreModal(
                                                            platoPadre
                                                        );
                                                        setShow(true);
                                                    }}>
                                                    <ChatRightText />
                                                </Button>
                                            </td>
                                            <td style={styleTd}>
                                                <OverlayTrigger
                                                    overlay={
                                                        <Tooltip
                                                            id={
                                                                plato +
                                                                platoPadre
                                                            }>
                                                            {platoPadre}
                                                        </Tooltip>
                                                    }>
                                                    <span>{platoPadre}</span>
                                                </OverlayTrigger>
                                            </td>
                                            <td style={styleTd}>
                                                <OverlayTrigger
                                                    overlay={
                                                        <Tooltip
                                                            id={
                                                                platoPadre +
                                                                plato
                                                            }>
                                                            {plato}
                                                        </Tooltip>
                                                    }>
                                                    <span>{plato}</span>
                                                </OverlayTrigger>
                                            </td>
                                            <td
                                                className={
                                                    datos
                                                        .filter(
                                                            (dato) =>
                                                                dato.plato ===
                                                                    plato &&
                                                                dato.platoPadre ===
                                                                    platoPadre
                                                        )
                                                        .reduce(
                                                            (sum, d) =>
                                                                sum +
                                                                d.cantidad,
                                                            0
                                                        ) >
                                                    produccion
                                                        .filter(
                                                            (d) =>
                                                                d.plato ===
                                                                    plato &&
                                                                d.platoPadre ===
                                                                    platoPadre
                                                        )
                                                        .reduce(
                                                            (sum, d) =>
                                                                sum +
                                                                d.cantidad,
                                                            0
                                                        )
                                                        ? 'text-danger'
                                                        : ''
                                                }
                                                style={styleTd}>
                                                {parseFloat(
                                                    datos
                                                        .filter(
                                                            (dato) =>
                                                                dato.plato ===
                                                                    plato &&
                                                                dato.platoPadre ===
                                                                    platoPadre
                                                        )
                                                        .reduce(
                                                            (sum, d) =>
                                                                sum +
                                                                d.cantidad,
                                                            0
                                                        )
                                                ).toFixed(2)}
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                        </tbody>
                    </Table>
                </div>
                <div
                    id="right-table"
                    className="no-scrollbar"
                    style={{
                        overflow: 'auto',
                        flexGrow: 1,
                    }}
                    onScroll={handleVerticalScrollRight}>
                    <Table
                        style={{
                            width: '100%',
                        }}
                        className="mx-auto"
                        size="sm"
                        bordered
                        striped>
                        <thead className="sticky-top">
                            {Array.from({ length: maxCantidadEventosDia }).map(
                                (_, index) => (
                                    <tr
                                        key={`spacer-${index}`}
                                        style={{
                                            height: heightTd,
                                            width: 'max-content',
                                        }}>
                                        {diasSemana.map((dia, i) => {
                                            const diaLimpio = new Date(dia);
                                            diaLimpio.setHours(0, 0, 0, 0);
                                            const eventosDia = eventos.filter(
                                                (d) => {
                                                    const fecha = new Date(
                                                        d.fecha
                                                    );
                                                    fecha.setHours(0, 0, 0, 0);
                                                    return (
                                                        fecha.getTime() ===
                                                        diaLimpio.getTime()
                                                    );
                                                }
                                            );
                                            const offset =
                                                maxCantidadEventosDia -
                                                eventosDia.length;
                                            const eventoIndex = index - offset;
                                            if (eventoIndex >= 0) {
                                                const evento =
                                                    eventosDia[eventoIndex];
                                                return (
                                                    <td
                                                        className="link-pdf"
                                                        onClick={() => {
                                                            if (
                                                                RolProvider ===
                                                                'consultor'
                                                            )
                                                                return;
                                                            setAdelantarEvento(
                                                                evento.id
                                                            );
                                                        }}
                                                        key={i + index}
                                                        style={{
                                                            ...styleEventos,
                                                            verticalAlign:
                                                                'middle',
                                                        }}>
                                                        {abreviar(evento.lugar)}
                                                        {' - '}
                                                        {evento.salon}
                                                    </td>
                                                );
                                            } else {
                                                return (
                                                    <td
                                                        key={i + index}
                                                        style={{
                                                            ...styleEventos,
                                                            verticalAlign:
                                                                'middle',
                                                        }}>
                                                        &nbsp;
                                                    </td>
                                                );
                                            }
                                        })}
                                    </tr>
                                )
                            )}
                            <tr style={{ textAlign: 'center' }}>
                                {diasSemana
                                    .filter(filterDias)
                                    .map((dia, idx) => (
                                        <th
                                            key={idx}
                                            style={{
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 2,
                                                minWidth: '15rem',
                                            }}
                                            className={
                                                idx < 14
                                                    ? 'bg-info text-dark'
                                                    : 'bg-dark text-white'
                                            }>
                                            {formatFecha(dia)}
                                        </th>
                                    ))}
                            </tr>
                        </thead>
                        <tbody>
                            {platosUnicos
                                .filter(filterPlatos)
                                .map(({ plato, platoPadre }) => (
                                    <React.Fragment key={plato + platoPadre}>
                                        <tr style={{ textAlign: 'center' }}>
                                            {diasSemana
                                                .filter(filterDias)
                                                .map((dia, i) => {
                                                    const diaLimpio = new Date(
                                                        dia
                                                    );
                                                    diaLimpio.setHours(
                                                        0,
                                                        0,
                                                        0,
                                                        0
                                                    );

                                                    const total =
                                                        produccion.filter(
                                                            (d) => {
                                                                const fecha =
                                                                    new Date(
                                                                        d.fecha
                                                                    );
                                                                fecha.setHours(
                                                                    0,
                                                                    0,
                                                                    0,
                                                                    0
                                                                );
                                                                fecha.setDate(
                                                                    fecha.getDate() +
                                                                        1
                                                                ); // Ajuste para comparar con el día limpio

                                                                return (
                                                                    d.plato ===
                                                                        plato &&
                                                                    d.platoPadre ===
                                                                        platoPadre &&
                                                                    fecha.getTime() ===
                                                                        diaLimpio.getTime()
                                                                );
                                                            }
                                                        );

                                                    const update =
                                                        produccionUpdate.filter(
                                                            (d) => {
                                                                const fecha =
                                                                    new Date(
                                                                        d.fecha
                                                                    );
                                                                fecha.setHours(
                                                                    0,
                                                                    0,
                                                                    0,
                                                                    0
                                                                );
                                                                fecha.setDate(
                                                                    fecha.getDate() +
                                                                        1
                                                                ); // Ajuste para comparar con el día limpio

                                                                return (
                                                                    d.plato ===
                                                                        plato &&
                                                                    d.platoPadre ===
                                                                        platoPadre &&
                                                                    fecha.getTime() ===
                                                                        diaLimpio.getTime()
                                                                );
                                                            }
                                                        );

                                                    const totalConsumo = datos
                                                        .filter((d) => {
                                                            const fecha =
                                                                new Date(
                                                                    d.fecha
                                                                );
                                                            fecha.setHours(
                                                                0,
                                                                0,
                                                                0,
                                                                0
                                                            );

                                                            return (
                                                                d.plato ===
                                                                    plato &&
                                                                d.platoPadre ===
                                                                    platoPadre &&
                                                                fecha.getTime() ===
                                                                    dia.getTime()
                                                            );
                                                        })
                                                        .reduce(
                                                            (sum, d) =>
                                                                sum +
                                                                d.cantidad,
                                                            0
                                                        );

                                                    let cantidad = '';

                                                    if (total.length > 0) {
                                                        cantidad = total.reduce(
                                                            (sum, d) =>
                                                                sum +
                                                                d.cantidad,
                                                            0
                                                        );
                                                    }

                                                    let updateCant = false;

                                                    if (update.length > 0) {
                                                        cantidad =
                                                            update.reduce(
                                                                (sum, d) =>
                                                                    sum +
                                                                    d.cantidad,
                                                                0
                                                            );

                                                        updateCant = true;
                                                    }

                                                    return (
                                                        <td
                                                            style={{
                                                                height: heightTd,
                                                                verticalAlign:
                                                                    'middle',
                                                            }}
                                                            key={
                                                                plato +
                                                                platoPadre +
                                                                i
                                                            }>
                                                            <Form.Control
                                                                type="number"
                                                                disabled={
                                                                    RolProvider ===
                                                                    'consultor'
                                                                }
                                                                style={{
                                                                    width: '100%',
                                                                    color: updateCant
                                                                        ? '#ff0000'
                                                                        : '#000000',
                                                                }}
                                                                className="form-control form-control-sm input"
                                                                value={cantidad}
                                                                placeholder={
                                                                    totalConsumo
                                                                        ? totalConsumo.toString()
                                                                        : ''
                                                                }
                                                                step={0.1}
                                                                min={0}
                                                                onChange={(
                                                                    e
                                                                ) => {
                                                                    const cantidad =
                                                                        parseFloat(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        );
                                                                    // if (isNaN(cantidad)) {
                                                                    //     return;
                                                                    // }
                                                                    const fecha =
                                                                        format(
                                                                            diaLimpio,
                                                                            'yyyy-MM-dd'
                                                                        );
                                                                    const nuevaProduccion =
                                                                        [
                                                                            ...produccionUpdate,
                                                                        ];
                                                                    const index =
                                                                        nuevaProduccion.findIndex(
                                                                            (
                                                                                p
                                                                            ) =>
                                                                                p.plato ===
                                                                                    plato &&
                                                                                p.platoPadre ===
                                                                                    platoPadre &&
                                                                                p.fecha ===
                                                                                    fecha
                                                                        );

                                                                    if (
                                                                        index >
                                                                        -1
                                                                    ) {
                                                                        nuevaProduccion[
                                                                            index
                                                                        ].cantidad =
                                                                            cantidad;
                                                                    } else {
                                                                        nuevaProduccion.push(
                                                                            {
                                                                                plato,
                                                                                platoPadre,
                                                                                fecha,
                                                                                cantidad,
                                                                            }
                                                                        );
                                                                    }
                                                                    setProduccionUpdate(
                                                                        nuevaProduccion
                                                                    );
                                                                    localStorage.setItem(
                                                                        'produccionUpdate',
                                                                        JSON.stringify(
                                                                            nuevaProduccion
                                                                        )
                                                                    );
                                                                }}
                                                            />
                                                        </td>
                                                    );
                                                })}
                                        </tr>
                                        {platoExpandido === plato && (
                                            <PlatoDetalle
                                                plato={plato}
                                                diasSemanaProp={diasSemana}
                                            />
                                        )}
                                    </React.Fragment>
                                ))}
                        </tbody>
                    </Table>
                </div>
            </div>

            {/* <div
                style={{
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    height: '14px',
                }}
                onScroll={handleFakeScroll}
                id="fake-scroll">
                <div style={{ width: '15000px', height: '1px' }}></div>
            </div> */}
        </>
    );
}
