/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import { Button, Card, Table } from 'react-bootstrap';
import { EyeFill, EyeSlashFill } from 'react-bootstrap-icons';
import Accordion from 'react-bootstrap/Accordion';
import { TableProduccion } from './TableProduccion';
import { NavegacionSemanal } from './navegacionSemanal';
import { addDays, startOfWeek } from 'date-fns';

export const Ingredientes = ({
    datos,
    plato,
}: {
    datos: any;
    plato: string;
}) => {
    const [ingredientes, setIngredientes] = useState<any[]>([]);
    const [platoExpandido, setPlatoExpandido] = useState('');
    const [indexExpandido, setIndexExpandido] = useState(0);
    const [produccionLocal, setProduccionLocal] = useState<{
        [key: string]: number;
    }>({});
    const [datosIngredientes, setDatosIngredientes] = useState<any>({});
    const [semanaBase, setSemanaBase] = useState(new Date());
    const [diasSemana, setDiasSemana] = useState<Date[]>([]);

    useEffect(() => {
        if (!datos.ingredientes) return;

        const ingredientesAgrupados: any = [];

        ingredientesAgrupados.push(
            datos.ingredientes.filter(
                (ingrediente: any) => ingrediente.depth === 0
            )
        );

        const gruposPT = datos.ingredientes.filter(
            (ingrediente: any) => ingrediente.tipo === 'PT'
        );

        gruposPT.forEach((grupoPT: any) => {
            const subIngredientes = datos.ingredientes.filter(
                (ingrediente: any) =>
                    (ingrediente.parentPT === grupoPT.nombre &&
                        ingrediente.depth > 0) ||
                    (ingrediente.tipo === 'PT' &&
                        ingrediente.nombre === grupoPT.nombre)
            );

            ingredientesAgrupados.push(subIngredientes);
        });

        setIngredientes(ingredientesAgrupados);
    }, [datos]);

    useEffect(() => {
        const inicioSemana = startOfWeek(semanaBase, { weekStartsOn: 0 }); // domingo
        const dias = Array.from({ length: 7 }, (_, i) =>
            addDays(inicioSemana, i)
        );
        setDiasSemana(dias);
    }, [semanaBase]);

    const calcularPorcionBruta = (cantidad: number) => {
        return (
            datos.plato.reduce(
                (sum: number, plato: any) => sum + plato.cantidad,
                0
            ) * cantidad
        );
    };

    const handleExpandir = (plato: string, index: number) => {
        if (plato === platoExpandido && index === indexExpandido) {
            setPlatoExpandido('');
            setIndexExpandido(0);
            return;
        }

        setPlatoExpandido(plato);
        setIndexExpandido(index);
    };

    const obtenerCantidadProduccion = (dia: Date) => {
        if (!datosIngredientes.producciones) {
            return '';
        }

        const produccion = datosIngredientes.producciones.find(
            (produccion: any) => {
                const fecha = new Date(produccion.fecha);
                fecha.setHours(0, 0, 0, 0);

                return fecha.getTime() === dia.getTime();
            }
        );

        if (!produccion) {
            return '';
        }

        return produccion.cantidad > 0 ? produccion.cantidad : '';
    };

    const guardarProduccion = async (plato: string) => {
        const res = await fetch('/api/produccion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plato: plato,
                produccion: produccionLocal,
            }),
        });

        const result = await res.json();

        if (!result.success) {
            // TODO MODAL
            alert('Error al guardar la producción');
            return;
        }

        setProduccionLocal({});
        setDatosIngredientes({ ...datos, producciones: result.data });

        // TODO MODAL
        alert('Producción guardada con éxito');
    };

    const consultarProduccionesIngrediente = (plato: string) => {
        fetch('api/produccionItem?nombrePlato=' + plato)
            .then((res) => res.json())
            .then(setDatosIngredientes);
    };

    if (ingredientes && ingredientes[0] && !ingredientes[0].length) {
        return (
            <Card>
                <Card.Body>
                    <Card.Title>Ingredientes</Card.Title>
                    <Card.Text>No hay ingredientes para este plato.</Card.Text>
                </Card.Body>
            </Card>
        );
    }

    return (
        <>
            <Accordion>
                <Accordion.Item eventKey="0">
                    <Accordion.Header>Ingredientes</Accordion.Header>

                    <Accordion.Body>
                        {ingredientes.map((group, index: number) => {
                            return (
                                <Accordion
                                    key={index}
                                    defaultActiveKey={'0'}>
                                    <Accordion.Item
                                        eventKey={index.toString()}
                                        className="mb-3">
                                        <Accordion.Header>
                                            {index === 0
                                                ? plato
                                                : group.find(
                                                      (ingrediente: any) =>
                                                          ingrediente.tipo ===
                                                          'PT'
                                                  ).nombre}
                                        </Accordion.Header>
                                        <Accordion.Body>
                                            {index > 0 && (
                                                <div className="mb-2">
                                                    Ingrediente de:{' '}
                                                    <span className="ml-3 badge bg-info">
                                                        {group[0].parentPT ||
                                                            plato}
                                                    </span>
                                                </div>
                                            )}

                                            <Table striped>
                                                <thead>
                                                    <tr>
                                                        <th></th>
                                                        <th>Ingrediente</th>
                                                        <th>Porcion Bruta</th>
                                                        <th>Unidad</th>
                                                        <th>Tipo</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="table-group-divider">
                                                    {group
                                                        .filter(
                                                            (
                                                                _: any,
                                                                i: number
                                                            ) =>
                                                                (index > 0 &&
                                                                    i !== 0) ||
                                                                index === 0
                                                        )
                                                        .map(
                                                            (
                                                                {
                                                                    porcionBruta,
                                                                    nombre,
                                                                    unidadMedida,
                                                                    tipo,
                                                                }: any,
                                                                i: number
                                                            ) => {
                                                                const cantidad =
                                                                    calcularPorcionBruta(
                                                                        porcionBruta
                                                                    );
                                                                return (
                                                                    <React.Fragment
                                                                        key={i}>
                                                                        <tr>
                                                                            <td>
                                                                                {platoExpandido ===
                                                                                    nombre &&
                                                                                i ===
                                                                                    indexExpandido ? (
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="outline-secondary"
                                                                                        style={{
                                                                                            width: '2rem',
                                                                                            height: '2rem',
                                                                                            display:
                                                                                                'flex',
                                                                                            justifyContent:
                                                                                                'center',
                                                                                            alignItems:
                                                                                                'center',
                                                                                        }}
                                                                                        onClick={() => {
                                                                                            handleExpandir(
                                                                                                nombre,
                                                                                                i
                                                                                            );
                                                                                            consultarProduccionesIngrediente(
                                                                                                nombre
                                                                                            );
                                                                                        }}>
                                                                                        <EyeSlashFill />
                                                                                    </Button>
                                                                                ) : (
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="outline-secondary"
                                                                                        style={{
                                                                                            width: '2rem',
                                                                                            height: '2rem',
                                                                                            display:
                                                                                                'flex',
                                                                                            justifyContent:
                                                                                                'center',
                                                                                            alignItems:
                                                                                                'center',
                                                                                        }}
                                                                                        onClick={() => {
                                                                                            handleExpandir(
                                                                                                nombre,
                                                                                                i
                                                                                            );
                                                                                            consultarProduccionesIngrediente(
                                                                                                nombre
                                                                                            );
                                                                                        }}>
                                                                                        <EyeFill />
                                                                                    </Button>
                                                                                )}
                                                                            </td>
                                                                            <td>
                                                                                {
                                                                                    nombre
                                                                                }
                                                                            </td>
                                                                            <td>
                                                                                {cantidad <
                                                                                    1 &&
                                                                                (unidadMedida ===
                                                                                    'KG' ||
                                                                                    unidadMedida ===
                                                                                        'LT')
                                                                                    ? cantidad *
                                                                                      1000
                                                                                    : cantidad}
                                                                            </td>
                                                                            <td>
                                                                                {cantidad <
                                                                                1
                                                                                    ? unidadMedida ===
                                                                                      'KG'
                                                                                        ? 'GR'
                                                                                        : unidadMedida ===
                                                                                          'LT'
                                                                                        ? 'ML'
                                                                                        : unidadMedida
                                                                                    : unidadMedida}
                                                                            </td>
                                                                            <td>
                                                                                <span
                                                                                    className={`badge bg-${
                                                                                        tipo ===
                                                                                        'MP'
                                                                                            ? 'info'
                                                                                            : 'warning'
                                                                                    }`}>
                                                                                    {
                                                                                        tipo
                                                                                    }
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                        {platoExpandido ===
                                                                            nombre &&
                                                                            indexExpandido ===
                                                                                i && (
                                                                                <tr
                                                                                    key={
                                                                                        i
                                                                                    }>
                                                                                    <td
                                                                                        colSpan={
                                                                                            5
                                                                                        }>
                                                                                        <NavegacionSemanal
                                                                                            semanaBase={
                                                                                                semanaBase
                                                                                            }
                                                                                            setSemanaBase={
                                                                                                setSemanaBase
                                                                                            }
                                                                                        />

                                                                                        <div className="bg-danger-subtle px-3 py-2 rounded mb-2 fw-semibold text-uppercase">
                                                                                            Produccion
                                                                                        </div>

                                                                                        <TableProduccion
                                                                                            diasSemana={
                                                                                                diasSemana
                                                                                            }
                                                                                            obtenerCantidadProduccion={
                                                                                                obtenerCantidadProduccion
                                                                                            }
                                                                                            guardarProduccion={
                                                                                                guardarProduccion
                                                                                            }
                                                                                            produccionLocal={
                                                                                                produccionLocal
                                                                                            }
                                                                                            setProduccionLocal={
                                                                                                setProduccionLocal
                                                                                            }
                                                                                            plato={
                                                                                                nombre
                                                                                            }
                                                                                        />
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                    </React.Fragment>
                                                                );
                                                            }
                                                        )}
                                                </tbody>
                                            </Table>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                </Accordion>
                            );
                        })}
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        </>
    );
};

export default Ingredientes;
