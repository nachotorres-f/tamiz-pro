/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect } from 'react';
import { Button, Table } from 'react-bootstrap';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlatoDetalle } from './platoDetalle';
import { EyeFill, EyeSlashFill, Plus, Dash } from 'react-bootstrap-icons';

export function TablaPlanificacion({
    pageOcultos,
    platosUnicos,
    diasSemana,
    datos,
    filtro,
    diaActivo,
    platoExpandido,
    setPlatoExpandido,
}: {
    pageOcultos: boolean;
    platosUnicos: string[];
    diasSemana: Date[];
    datos: any[];
    filtro: string;
    diaActivo: string;
    platoExpandido: string | null;
    setPlatoExpandido: (value: string | null) => void;
}) {
    const [ocultos, setOcultos] = React.useState<Set<string>>(new Set());

    useEffect(() => {
        fetch('/api/ocultos')
            .then((res) => res.json())
            .then((ocultosDB) => setOcultos(new Set(ocultosDB)));
    }, []);

    const ocultarPlato = async (plato: string) => {
        await fetch('/api/ocultos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plato }),
        });
        setOcultos(new Set([...ocultos, plato]));
    };

    const mostrarPlato = async (plato: string) => {
        await fetch(`/api/ocultos?plato=${encodeURIComponent(plato)}`, {
            method: 'DELETE',
        });
        const nuevos = new Set(ocultos);
        nuevos.delete(plato);
        setOcultos(nuevos);
    };

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

    return (
        <Table
            bordered
            responsive
            striped>
            <thead className="table-dark">
                <tr>
                    <th></th>
                    <th>Plato</th>
                    {diasSemana.filter(filterDias).map((dia, idx) => (
                        <th key={idx}>
                            {format(dia, 'EEEE d MMMM', { locale: es })}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {platosUnicos.filter(filterPlatos).map((plato) => (
                    <React.Fragment key={plato}>
                        <tr>
                            <td className="d-flex gap-2 align-items-center">
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

                                {pageOcultos ? (
                                    <Button
                                        size="sm"
                                        variant="outline-secondary"
                                        style={{
                                            width: '2rem',
                                            height: '2rem',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                        onClick={() => mostrarPlato(plato)}>
                                        <EyeFill />
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="outline-secondary"
                                        style={{
                                            width: '2rem',
                                            height: '2rem',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                        onClick={() => ocultarPlato(plato)}>
                                        <EyeSlashFill />
                                    </Button>
                                )}
                            </td>
                            <td>{plato}</td>
                            {diasSemana.filter(filterDias).map((dia, i) => {
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
                            })}
                        </tr>
                        {platoExpandido === plato && (
                            <PlatoDetalle plato={plato} />
                        )}
                    </React.Fragment>
                ))}
            </tbody>
        </Table>
    );
}
