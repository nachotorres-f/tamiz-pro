/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect } from 'react';
import { Button, Form, Table } from 'react-bootstrap';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlatoDetalle } from './platoDetalle';
import { /* EyeFill, EyeSlashFill, */ Plus, Dash } from 'react-bootstrap-icons';

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
    setProduccionUpdate,
    setPlatoExpandido,
}: // anchoButton,
// anchoPlato,
// anchoTotal,
{
    pageOcultos: boolean;
    platosUnicos: string[];
    diasSemana: Date[];
    datos: any[];
    filtro: string;
    diaActivo: string;
    platoExpandido: string | null;
    produccion: any[];
    produccionUpdate: any[];
    setProduccion: (value: any[]) => void;
    setProduccionUpdate: (value: any[]) => void;
    // anchoButton: any;
    // anchoPlato: any;
    // anchoTotal: any;
    setPlatoExpandido: (value: string | null) => void;
}) {
    const [ocultos, setOcultos] = React.useState<Set<string>>(new Set());

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

    const filterPlatos = (plato: string) => {
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
        const letraDia = nombreDia.charAt(0).toUpperCase(); // "L"
        const diaNumero = format(dia, 'd'); // "5"
        const mesNumero = format(dia, 'M'); // "8"
        return `${letraDia} ${diaNumero}-${mesNumero}`;
    };

    return (
        <>
            <Table
                style={{
                    width: 'max-content',
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
                                position: 'sticky',
                                left: 0,
                                zIndex: 4,
                            }}></th>
                        <th
                            style={{
                                minWidth: '2rem',
                                position: 'sticky',
                                left: '2.8rem',
                                zIndex: 4,
                            }}>
                            Plato
                        </th>
                        <th
                            style={{
                                minWidth: '2rem',
                                position: 'sticky',
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
                    {platosUnicos.filter(filterPlatos).map((plato) => (
                        <React.Fragment key={plato}>
                            <tr style={{ textAlign: 'center' }}>
                                <td
                                    rowSpan={2}
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
                                </td>
                                <td
                                    rowSpan={2}
                                    style={{
                                        minWidth: '2rem',
                                        position: 'sticky',
                                        left: '2.9rem',
                                        width: '3rem',
                                        zIndex: 4,
                                    }}>
                                    {plato}
                                </td>
                                <td
                                    rowSpan={2}
                                    style={{
                                        minWidth: '2rem',
                                        position: 'sticky',
                                        left: '9.8rem',
                                        zIndex: 4,
                                    }}>
                                    {parseFloat(
                                        datos
                                            .filter(
                                                (dato) => dato.plato === plato
                                            )
                                            .reduce(
                                                (sum, d) => sum + d.cantidad,
                                                0
                                            )
                                    ).toFixed(2)}
                                </td>
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
                                    .map((diaS, i) => {
                                        const dia = new Date(diaS);
                                        dia.setHours(0, 0, 0, 0);
                                        const total = datos
                                            .filter((d) => {
                                                const fecha = new Date(d.fecha);
                                                fecha.setHours(0, 0, 0, 0);

                                                return (
                                                    d.plato === plato &&
                                                    fecha.getTime() ===
                                                        dia.getTime()
                                                );
                                            })
                                            .reduce(
                                                (sum, d) => sum + d.cantidad,
                                                0
                                            );
                                        return <td key={i}>{total || ''}</td>;
                                    })}
                            </tr>
                            <tr>
                                {diasSemana.filter(filterDias).map((dia, i) => {
                                    const diaLimpio = new Date(dia);
                                    diaLimpio.setHours(0, 0, 0, 0);

                                    const total = produccion.filter((d) => {
                                        const fecha = new Date(d.fecha);
                                        fecha.setHours(0, 0, 0, 0);
                                        fecha.setDate(fecha.getDate() + 1); // Ajuste para comparar con el día limpio

                                        return (
                                            d.plato === plato &&
                                            fecha.getTime() ===
                                                diaLimpio.getTime()
                                        );
                                    });

                                    const update = produccionUpdate.filter(
                                        (d) => {
                                            const fecha = new Date(d.fecha);
                                            fecha.setHours(0, 0, 0, 0);
                                            fecha.setDate(fecha.getDate() + 1); // Ajuste para comparar con el día limpio

                                            return (
                                                d.plato === plato &&
                                                fecha.getTime() ===
                                                    diaLimpio.getTime()
                                            );
                                        }
                                    );

                                    let cantidad = '';

                                    if (total.length > 0) {
                                        cantidad = total.reduce(
                                            (sum, d) => sum + d.cantidad,
                                            0
                                        );
                                    }

                                    if (update.length > 0) {
                                        cantidad = update.reduce(
                                            (sum, d) => sum + d.cantidad,
                                            0
                                        );
                                    }

                                    return (
                                        <td key={plato + i}>
                                            <Form.Control
                                                type="number"
                                                className="form-control form-control-sm"
                                                style={{ width: '5.5rem' }}
                                                value={cantidad}
                                                step={0.1}
                                                min={0}
                                                onChange={(e) => {
                                                    console.log(e.target.value);
                                                    const cantidad = parseFloat(
                                                        e.target.value
                                                    );
                                                    // if (isNaN(cantidad)) {
                                                    //     return;
                                                    // }
                                                    const fecha = format(
                                                        diaLimpio,
                                                        'yyyy-MM-dd'
                                                    );
                                                    const nuevaProduccion = [
                                                        ...produccionUpdate,
                                                    ];
                                                    const index =
                                                        nuevaProduccion.findIndex(
                                                            (p) =>
                                                                p.plato ===
                                                                    plato &&
                                                                p.fecha ===
                                                                    fecha
                                                        );

                                                    console.log(
                                                        'CANTIDAD',
                                                        cantidad
                                                    );
                                                    if (index > -1) {
                                                        nuevaProduccion[
                                                            index
                                                        ].cantidad = cantidad;
                                                    } else {
                                                        nuevaProduccion.push({
                                                            plato,
                                                            fecha,
                                                            cantidad,
                                                        });
                                                    }
                                                    setProduccionUpdate(
                                                        nuevaProduccion
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
