/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import { Button, FloatingLabel, Form, Modal, Table } from 'react-bootstrap';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlatoDetalle } from './platoDetalle';
import { ChatRightText } from 'react-bootstrap-icons';

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
    setObservaciones,
    setProduccionUpdate,
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
    setObservaciones: (
        value: { plato: string; observacion: string; platoPadre: string }[]
    ) => void;
    setProduccion: (value: any[]) => void;
    setProduccionUpdate: (value: any[]) => void;
    // anchoButton: any;
    // anchoPlato: any;
    // anchoTotal: any;
    setPlatoExpandido: (value: string | null) => void;
}) {
    const [ocultos, setOcultos] = React.useState<Set<string>>(new Set());
    const [show, setShow] = useState(false);
    const [platoModal, setPlatoModal] = useState('');
    const [platoPadreModal, setPlatoPadreModal] = useState('');
    const [observacionModal, setObservacionModal] = useState('');
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
                </Modal.Footer>
            </Modal>

            <Table
                style={{
                    width: '100%',
                }}
                className="mx-auto"
                size="sm"
                bordered
                striped>
                <thead className="table-dark sticky-top">
                    <tr style={{ textAlign: 'center' }}>
                        {/* <th ref={anchoButton}></th>
                    <th ref={anchoPlato}>Plato</th>
                    <th ref={anchoTotal}>Total</th> */}
                        <th
                            style={{
                                minWidth: '3rem',
                                // position: 'sticky',
                                left: 0,
                                zIndex: 4,
                            }}></th>
                        <th
                            style={{
                                minWidth: '2rem',
                                // position: 'sticky',
                                left: '',
                                zIndex: 4,
                            }}>
                            Plato Padre
                        </th>
                        <th
                            style={{
                                minWidth: '2rem',
                                // position: 'sticky',
                                left: '2.8rem',
                                zIndex: 4,
                            }}>
                            Plato
                        </th>
                        <th
                            style={{
                                minWidth: '2rem',
                                // position: 'sticky',
                                left: '9.8rem',
                                zIndex: 4,
                            }}>
                            Total
                        </th>
                        {diasSemana.filter(filterDias).map((dia, idx) => (
                            <th key={idx}>
                                {
                                    //                                     const nombreDia = format(dia, 'EEEE', { locale: es }); // "sábado"
                                    // const letraDia = nombreDia.charAt(0).toUpperCase();    // "S"
                                    // const diaNumero = format(dia, 'd');                    // "5"
                                    // const mesNumero = format(dia, 'M');                    // "7"
                                    // const resultado = `${letraDia} ${diaNumero}-${mesNumero}`;
                                }
                                {formatFecha(dia)}
                                {/* {format(dia, 'EEE d-M', {
                                    locale: es,
                                })}{' '} */}
                                {/* "Sáb 5-7" */}
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
                                    {/* <td
                                    className="align-items-center"
                                    style={{
                                        minWidth: '3rem',
                                        position: 'sticky',
                                        left: '0',
                                        zIndex: 4,
                                    }}>
                                    <Button
                                        size="sm"
                                        variant={
                                            platoExpandido === plato
                                                ? 'danger'
                                                : 'outline-primary'
                                        }
                                        style={{
                                            width: '2rem',
                                            height: '2rem',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                        onClick={() => {
                                            setPlatoExpandido(
                                                platoExpandido === plato
                                                    ? null
                                                    : plato
                                            );
                                        }}>
                                        {platoExpandido === plato ? (
                                            <Dash />
                                        ) : (
                                            <Plus />
                                        )}
                                    </Button>
                                </td> */}
                                    <td>
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            style={{
                                                width: '2rem',
                                                height: '2rem',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                            }}
                                            onClick={() => {
                                                const observacion =
                                                    observaciones.find(
                                                        (o) =>
                                                            o.plato === plato &&
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

                                                    if (prod.length > 0) {
                                                        setObservacionModal(
                                                            prod[0].observacion
                                                        );
                                                    } else {
                                                        setObservacionModal('');
                                                    }
                                                }

                                                setPlatoModal(plato);
                                                setPlatoPadreModal(platoPadre);
                                                setShow(true);
                                            }}>
                                            <ChatRightText />
                                        </Button>
                                    </td>
                                    <td>{platoPadre}</td>
                                    <td
                                        style={{
                                            minWidth: '2rem',
                                            left: '2.9rem',
                                            width: '3rem',
                                            zIndex: 4,
                                        }}>
                                        {plato}
                                    </td>
                                    {
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
                                                            sum + d.cantidad,
                                                        0
                                                    ) >
                                                produccion
                                                    .filter(
                                                        (d) =>
                                                            d.plato === plato &&
                                                            d.platoPadre ===
                                                                platoPadre
                                                    )
                                                    .reduce(
                                                        (sum, d) =>
                                                            sum + d.cantidad,
                                                        0
                                                    )
                                                    ? 'text-danger'
                                                    : ''
                                            }
                                            style={{
                                                minWidth: '2rem',
                                                position: 'sticky',
                                                left: '9.8rem',
                                                zIndex: 4,
                                            }}>
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
                                                            sum + d.cantidad,
                                                        0
                                                    )
                                            ).toFixed(2)}
                                        </td>
                                    }
                                    {/* <td rowSpan={2}>
                                    {(() => {
                                        const gestionados = datos
                                            .filter(
                                                (dato) => dato.plato === plato
                                            )
                                            .map((dato) => dato.gestionado);
                                        if (
                                            gestionados.length === 0 ||
                                            gestionados.every(
                                                (g) => g === false
                                            )
                                        )
                                            return 'No gestionado';
                                        if (
                                            gestionados.every((g) => g === true)
                                        )
                                            return 'Gestionado';
                                        return 'Parcialmente gestionado';
                                    })()}
                                </td> */}
                                    {diasSemana
                                        .filter(filterDias)
                                        .map((dia, i) => {
                                            const diaLimpio = new Date(dia);
                                            diaLimpio.setHours(0, 0, 0, 0);

                                            const total = produccion.filter(
                                                (d) => {
                                                    const fecha = new Date(
                                                        d.fecha
                                                    );
                                                    fecha.setHours(0, 0, 0, 0);
                                                    fecha.setDate(
                                                        fecha.getDate() + 1
                                                    ); // Ajuste para comparar con el día limpio

                                                    return (
                                                        d.plato === plato &&
                                                        d.platoPadre ===
                                                            platoPadre &&
                                                        fecha.getTime() ===
                                                            diaLimpio.getTime()
                                                    );
                                                }
                                            );

                                            const update =
                                                produccionUpdate.filter((d) => {
                                                    const fecha = new Date(
                                                        d.fecha
                                                    );
                                                    fecha.setHours(0, 0, 0, 0);
                                                    fecha.setDate(
                                                        fecha.getDate() + 1
                                                    ); // Ajuste para comparar con el día limpio

                                                    return (
                                                        d.plato === plato &&
                                                        d.platoPadre ===
                                                            platoPadre &&
                                                        fecha.getTime() ===
                                                            diaLimpio.getTime()
                                                    );
                                                });

                                            const totalConsumo = datos
                                                .filter((d) => {
                                                    const fecha = new Date(
                                                        d.fecha
                                                    );
                                                    fecha.setHours(0, 0, 0, 0);

                                                    return (
                                                        d.plato === plato &&
                                                        d.platoPadre ===
                                                            platoPadre &&
                                                        fecha.getTime() ===
                                                            dia.getTime()
                                                    );
                                                })
                                                .reduce(
                                                    (sum, d) =>
                                                        sum + d.cantidad,
                                                    0
                                                );

                                            let cantidad = '';

                                            if (total.length > 0) {
                                                cantidad = total.reduce(
                                                    (sum, d) =>
                                                        sum + d.cantidad,
                                                    0
                                                );
                                            }

                                            let updateCant = false;

                                            if (update.length > 0) {
                                                cantidad = update.reduce(
                                                    (sum, d) =>
                                                        sum + d.cantidad,
                                                    0
                                                );

                                                updateCant = true;
                                            }

                                            return (
                                                <td
                                                    key={
                                                        plato + platoPadre + i
                                                    }>
                                                    <Form.Control
                                                        type="number"
                                                        style={{
                                                            width: '5.5rem',
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
                                                        onChange={(e) => {
                                                            const cantidad =
                                                                parseFloat(
                                                                    e.target
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
                                                                    (p) =>
                                                                        p.plato ===
                                                                            plato &&
                                                                        p.platoPadre ===
                                                                            platoPadre &&
                                                                        p.fecha ===
                                                                            fecha
                                                                );

                                                            if (index > -1) {
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
        </>
    );
}
