/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { addDays, format, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { Table } from 'react-bootstrap';
import Ingredientes from './ingredientes';
import { TableProduccion } from './TableProduccion';
import { NavegacionSemanal } from './navegacionSemanal';

interface Plato {
    cantidad: number;
    comanda: Comanda;
}

interface Comanda {
    nombre: string;
    fecha: string;
}

export function PlatoDetalle({ plato }: { plato: string }) {
    const [datos, setDatos] = useState<any>({});
    // const [isEditar, setIsEditar] = useState(false);
    const [produccionLocal, setProduccionLocal] = useState<{
        [key: string]: number;
    }>({});
    const [semanaBase, setSemanaBase] = useState(new Date());
    const [diasSemana, setDiasSemana] = useState<Date[]>([]);

    useEffect(() => {
        fetch('/api/platoDetalle?nombrePlato=' + plato)
            .then((res) => res.json())
            .then(setDatos);
    }, [plato]);

    useEffect(() => {
        const inicioSemana = startOfWeek(semanaBase, { weekStartsOn: 0 }); // domingo
        const dias = Array.from({ length: 7 }, (_, i) =>
            addDays(inicioSemana, i)
        );
        setDiasSemana(dias);
    }, [semanaBase]);

    const guardarProduccion = async () => {
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
        setDatos({ ...datos, producciones: result.data });

        // TODO MODAL
        alert('Producción guardada con éxito');
    };

    const obtenerCantidadProduccion = (dia: Date) => {
        if (!datos.producciones) {
            return '';
        }

        const produccion = datos.producciones.find((produccion: any) => {
            const fecha = new Date(produccion.fecha);
            fecha.setHours(0, 0, 0, 0);

            return fecha.getTime() === dia.getTime();
        });

        if (!produccion) {
            return '';
        }

        return produccion.cantidad > 0 ? produccion.cantidad : '';
    };

    return (
        <tr>
            <td colSpan={diasSemana.length + 2}>
                <div className="bg-success-subtle px-3 py-2 rounded mb-2 fw-semibold text-uppercase">
                    Comanda
                </div>
                <Table
                    striped
                    responsive
                    className="mb-5">
                    <thead className="table-dark">
                        <tr>
                            <th>Eventos</th>
                            <th>Fecha</th>
                            <th>Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        {datos.plato &&
                            datos.plato.map((plato: Plato, i: number) => {
                                return (
                                    <tr key={i}>
                                        <td>{plato.comanda.nombre}</td>
                                        <td>
                                            {format(
                                                new Date(plato.comanda.fecha),
                                                'EEEE, d MMMM yyyy',
                                                { locale: es }
                                            )}
                                        </td>
                                        <td>{plato.cantidad}</td>
                                    </tr>
                                );
                            })}
                    </tbody>
                    <tfoot className="table-dark">
                        <tr>
                            <td
                                colSpan={2}
                                className="text-center">
                                Total
                            </td>
                            <td>
                                {datos.plato &&
                                    datos.plato.reduce(
                                        (sum: number, plato: Plato) =>
                                            sum + plato.cantidad,
                                        0
                                    )}
                            </td>
                        </tr>
                    </tfoot>
                </Table>

                <NavegacionSemanal
                    semanaBase={semanaBase}
                    setSemanaBase={setSemanaBase}
                />

                <div className="bg-danger-subtle px-3 py-2 rounded mb-2 fw-semibold text-uppercase">
                    Produccion
                </div>

                <TableProduccion
                    diasSemana={diasSemana}
                    obtenerCantidadProduccion={obtenerCantidadProduccion}
                    guardarProduccion={guardarProduccion}
                    produccionLocal={produccionLocal}
                    setProduccionLocal={setProduccionLocal}
                />

                <Ingredientes
                    datos={datos}
                    plato={plato}></Ingredientes>
            </td>
        </tr>
    );
}
