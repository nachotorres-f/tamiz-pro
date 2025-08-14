/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { Table, Form, Button } from 'react-bootstrap';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TableProduccionProps {
    diasSemana: Date[];
    obtenerCantidadProduccion: (dia: Date) => number;
    guardarProduccion: (() => void) | ((arg0: string) => void);
    setProduccionLocal: any;
    produccionLocal: any;
    plato?: string;
}

export const TableProduccion: React.FC<TableProduccionProps> = ({
    diasSemana,
    obtenerCantidadProduccion,
    guardarProduccion,
    setProduccionLocal,
    produccionLocal,
    plato,
}) => {
    const [isEditar, setIsEditar] = useState(false);

    return (
        <>
            <Table
                size="sm"
                bordered
                className="mb-3">
                <thead className="table-dark sticky-top">
                    <tr style={{ textAlign: 'center' }}>
                        {diasSemana.map((dia, i) => (
                            <th key={i}>
                                {format(dia, 'EEEE d MMMM', { locale: es })}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr style={{ textAlign: 'center' }}>
                        {diasSemana.map((dia, i) => {
                            const key = format(dia, 'yyyy-MM-dd');
                            dia.setHours(0, 0, 0, 0);
                            const cantidad = obtenerCantidadProduccion(dia);

                            return (
                                <td key={i}>
                                    {isEditar ? (
                                        <Form.Control
                                            size="sm"
                                            type="number"
                                            step={0.1}
                                            min={0}
                                            value={
                                                produccionLocal[key] ||
                                                obtenerCantidadProduccion(
                                                    dia
                                                ) ||
                                                0
                                            }
                                            onChange={(e) => {
                                                e.preventDefault();
                                                let val = parseFloat(
                                                    e.target.value
                                                );

                                                if (e.target.value === '') {
                                                    val = 0;
                                                }

                                                setProduccionLocal(
                                                    (prev: any) => ({
                                                        ...prev,
                                                        [key]: val,
                                                    })
                                                );
                                            }}
                                        />
                                    ) : cantidad > 0 ? (
                                        cantidad
                                    ) : (
                                        ''
                                    )}
                                </td>
                            );
                        })}
                    </tr>
                </tbody>
            </Table>
            <div className="d-flex justify-content-end">
                {Object.keys(produccionLocal).length > 0 && (
                    <Button
                        variant="success"
                        onClick={() => {
                            guardarProduccion(plato || '');
                            setIsEditar(false);
                        }}
                        className="mx-3 mb-3">
                        Guardar
                    </Button>
                )}

                <Button
                    onClick={() => setIsEditar(!isEditar)}
                    className="mb-3"
                    variant={isEditar ? 'danger' : 'warning'}>
                    {isEditar ? 'Cancelar' : 'Editar'}
                </Button>
            </div>
        </>
    );
};
