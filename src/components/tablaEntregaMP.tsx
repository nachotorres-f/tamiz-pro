/* eslint-disable @typescript-eslint/no-explicit-any */
// /* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import { Button, Table } from 'react-bootstrap';
// import { format } from 'date-fns';
// import { es } from 'date-fns/locale';
import { PlatoDetalle } from './platoDetalle';
import ModalEntregaMP from './modalEntregaMP';

export function TablaEntregaMP({
    pageOcultos,
    platosUnicos,
    // diasSemana,
    // datos,
    // filtro,
    // diaActivo,
    platoExpandido,
    datos,
}: {
    pageOcultos: boolean;
    platosUnicos: string[];
    // diasSemana?: Date[];
    // filtro?: string;
    // diaActivo?: string;
    platoExpandido: string | null;
    datos: any[]; // Puedes reemplazar 'any[]' por el tipo correcto si lo tienes definido
    setPlatoExpandido: (value: string | null) => void;
}) {
    const [ocultos, setOcultos] = React.useState<Set<string>>(new Set());
    const [mostrarModal, setMostrarModal] = useState(false);
    const [ingredienteSeleccionado, setIngredienteSeleccionado] = useState('');

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

        // if (!filtro) return true;

        // return plato.toLowerCase().includes(filtro.toLowerCase());
        return true;
    };

    // const filterDias = (dia: Date) => {
    //     if (diaActivo && format(dia, 'yyyy-MM-dd') !== diaActivo) {
    //         return false;
    //     }
    //     return true;
    // };

    return (
        <>
            <ModalEntregaMP
                key={ingredienteSeleccionado}
                show={mostrarModal}
                onHide={() => setMostrarModal(false)}
                ingrediente={ingredienteSeleccionado}
                datos={datos} // este es tu array con ingredientes, fechas y cantidades
            />
            <Table
                size="sm"
                bordered
                striped
                className="mx-auto"
                style={{ tableLayout: 'auto', width: 'auto' }}>
                <thead className="table-dark sticky-top">
                    <tr style={{ textAlign: 'center' }}>
                        {/* <th ref={anchoButton}></th>
                    <th ref={anchoPlato}>Plato</th>
                    <th ref={anchoTotal}>Total</th> */}
                        <th>Plato</th>
                        <th></th>
                        {/* <th>Total</th>
                    {diasSemana.filter(filterDias).map((dia, idx) => (
                        <th key={idx}>
                            {format(dia, 'EEEE d MMMM', { locale: es })}
                        </th>
                    ))} */}
                    </tr>
                </thead>
                <tbody>
                    {platosUnicos.filter(filterPlatos).map((plato) => (
                        <React.Fragment key={plato}>
                            <tr style={{ textAlign: 'center' }}>
                                <td>{plato}</td>
                                <td className="d-flex gap-2 align-items-center">
                                    <Button
                                        size="sm"
                                        variant="outline-primary"
                                        onClick={() => {
                                            setIngredienteSeleccionado(plato); // o el nombre dinámico
                                            setMostrarModal(true);
                                        }}>
                                        Producción
                                    </Button>
                                </td>
                                {/* <td>
                                {datos
                                    .filter((dato) => dato.plato === plato)
                                    .reduce((sum, d) => sum + d.cantidad, 0)}
                            </td> */}
                                {/* {diasSemana.filter(filterDias).map((dia, i) => {
                                dia.setHours(0, 0, 0, 0);
                                const total = datos
                                    .filter((d) => {
                                        const fecha = new Date(d.fecha);
                                        fecha.setHours(0, 0, 0, 0);

                                        return (
                                            d.plato === plato &&
                                            fecha.getTime() === dia.getTime()
                                        );
                                    })
                                    .reduce((sum, d) => sum + d.cantidad, 0);
                                return (
                                    <td
                                        key={i}
                                        className={
                                            total > 0 ? 'bg-success-subtle' : ''
                                        }>
                                        {total || ''}
                                    </td>
                                );
                            })} */}
                            </tr>
                            {platoExpandido === plato && (
                                <PlatoDetalle
                                    plato={plato}
                                    diasSemanaProp={[]}
                                />
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </Table>
        </>
    );
}
