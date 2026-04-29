'use client';

import React, { useContext, useEffect, useState } from 'react';
import {
    Accordion,
    Alert,
    Badge,
    Button,
    Container,
    Table,
} from 'react-bootstrap';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RolContext, SalonContext } from '@/components/filtroPlatos';
import { ExpedicionRecetaModal } from '@/components/ExpedicionRecetaModal';
import { Loading } from '@/components/loading';
import type { ExpedicionPlatoResumen } from '@/server/expedicion/receta';

interface EventoSemana {
    id: number;
    lugar: string;
    salon: string;
    fecha: string;
    nombre: string;
}

interface ExpedicionComandaDetalle {
    comanda: {
        id: number;
        nombre: string;
        lugar: string;
        salon: string;
        fecha: string;
        cantidadInvitados: number;
    };
    platos: ExpedicionPlatoResumen[];
}

const formatearFechaTitulo = (fecha: string) =>
    format(new Date(fecha), 'EEEE dd/MM/yyyy', {
        locale: es,
    });

const formatearCantidad = (valor: number) =>
    Number(valor.toFixed(4)).toString();

export default function ExpedicionPage() {
    const rol = useContext(RolContext);
    const salon = useContext(SalonContext);
    const [comandas, setComandas] = useState<ExpedicionComandaDetalle[]>([]);
    const [selectedPlato, setSelectedPlato] =
        useState<ExpedicionPlatoResumen | null>(null);
    const [selectedComandaId, setSelectedComandaId] = useState<number | null>(
        null,
    );
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        const cargarComandas = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch('/api/expedicion?salon=' + salon);

                if (!response.ok) {
                    throw new Error('No se pudo cargar la agenda de expedición.');
                }

                const eventos = (await response.json()) as EventoSemana[];

                const detalles = await Promise.all(
                    eventos.map(async (evento) => {
                        const detalleResponse = await fetch(
                            '/api/exEvento?id=' + evento.id,
                        );

                        if (!detalleResponse.ok) {
                            throw new Error(
                                `No se pudo cargar la comanda ${evento.id}.`,
                            );
                        }

                        return (await detalleResponse.json()) as ExpedicionComandaDetalle;
                    }),
                );

                if (!active) {
                    return;
                }

                setComandas(detalles);
                setSelectedComandaId(null);
                setSelectedPlato(null);
                setShowModal(false);
            } catch (fetchError: unknown) {
                if (!active) {
                    return;
                }

                console.error('Error fetching expedition data:', fetchError);
                setComandas([]);
                setError('No se pudo cargar la lista de comandas de expedición.');
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        void cargarComandas();

        return () => {
            active = false;
        };
    }, [salon]);

    const exportToExcel = () => {
        const flatData = comandas.flatMap((detalle) =>
            detalle.platos.map((item) => ({
                'Comanda ID': detalle.comanda.id,
                Comanda: detalle.comanda.nombre,
                Lugar: detalle.comanda.lugar,
                Salon: detalle.comanda.salon,
                Fecha: format(new Date(detalle.comanda.fecha), 'dd/MM/yyyy'),
                Codigo: item.codigo || '',
                PT: item.nombre,
                Cantidad: item.cantidad,
                'Tiene receta': item.tieneReceta ? 'Sí' : 'No',
                Expedidos: item.ingredientesExpedidos,
                Ingredientes: item.ingredientesTotales,
            })),
        );

        import('xlsx').then((XLSX) => {
            const worksheet = XLSX.utils.json_to_sheet(flatData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Expedicion');
            XLSX.writeFile(workbook, 'expedicion.xlsx');
        });
    };

    const updatePlatoResumen = (
        comandaId: number,
        platoId: number,
        resumen: Pick<
            ExpedicionPlatoResumen,
            'ingredientesTotales' | 'ingredientesExpedidos'
        >,
    ) => {
        setComandas((actual) =>
            actual.map((detalle) =>
                detalle.comanda.id === comandaId
                    ? {
                          ...detalle,
                          platos: detalle.platos.map((plato) =>
                              plato.platoId === platoId
                                  ? {
                                        ...plato,
                                        ...resumen,
                                    }
                                  : plato,
                          ),
                      }
                    : detalle,
            ),
        );

        setSelectedPlato((actual) =>
            actual?.platoId === platoId
                ? {
                      ...actual,
                      ...resumen,
                  }
                : actual,
        );
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <Container className="mt-5">
            <h2 className="text-center mb-4">Expedicion</h2>

            {error && <Alert variant="danger">{error}</Alert>}

            <div className="d-flex justify-content-between align-items-center mt-3 mb-4 gap-3 flex-wrap">
                <Button
                    className="btn-success"
                    disabled={comandas.length === 0}
                    onClick={exportToExcel}>
                    Exportar a Excel
                </Button>

                <div className="d-flex gap-2 flex-wrap">
                    <Badge bg="dark">Comandas {comandas.length}</Badge>
                    <Badge bg="info">
                        PT{' '}
                        {comandas.reduce(
                            (acumulado, detalle) =>
                                acumulado + detalle.platos.length,
                            0,
                        )}
                    </Badge>
                </div>
            </div>

            {comandas.length === 0 ? (
                <Alert variant="warning">
                    No hay comandas de expedición desde hoy hasta la próxima
                    semana.
                </Alert>
            ) : (
                <Accordion alwaysOpen className="mb-3">
                    {comandas.map((detalle, index) => (
                        <Accordion.Item
                            eventKey={String(index)}
                            key={detalle.comanda.id}>
                            <Accordion.Header>
                                <span className="me-2 fw-semibold">
                                    {detalle.comanda.nombre}
                                </span>
                                <span className="text-body-secondary">
                                    {detalle.comanda.lugar} | {detalle.comanda.salon}{' '}
                                    | {formatearFechaTitulo(detalle.comanda.fecha)}
                                </span>
                            </Accordion.Header>
                            <Accordion.Body>
                                <div className="d-flex gap-2 flex-wrap mb-3">
                                    <Badge bg="dark">
                                        Comanda #{detalle.comanda.id}
                                    </Badge>
                                    <Badge bg="secondary">
                                        Invitados {detalle.comanda.cantidadInvitados}
                                    </Badge>
                                    <Badge bg="info">
                                        PT {detalle.platos.length}
                                    </Badge>
                                </div>

                                {detalle.platos.length === 0 ? (
                                    <Alert variant="warning" className="mb-0">
                                        Esta comanda no tiene PT cargados.
                                    </Alert>
                                ) : (
                                    <Table responsive hover className="mb-0 align-middle">
                                        <thead>
                                            <tr>
                                                <th>Código</th>
                                                <th>PT</th>
                                                <th>Cantidad</th>
                                                <th>Receta</th>
                                                <th>Expedición</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detalle.platos.map((plato) => (
                                                <tr key={plato.platoId}>
                                                    <td>{plato.codigo || '-'}</td>
                                                    <td>
                                                        <Button
                                                            variant="link"
                                                            className="p-0 text-start fw-semibold text-decoration-none"
                                                            onClick={() => {
                                                                setSelectedComandaId(
                                                                    detalle.comanda.id,
                                                                );
                                                                setSelectedPlato(plato);
                                                                setShowModal(true);
                                                            }}>
                                                            {plato.nombre}
                                                        </Button>
                                                    </td>
                                                    <td>
                                                        {formatearCantidad(
                                                            plato.cantidad,
                                                        )}
                                                    </td>
                                                    <td>
                                                        <Badge
                                                            bg={
                                                                plato.tieneReceta
                                                                    ? 'success'
                                                                    : 'warning'
                                                            }
                                                            text={
                                                                plato.tieneReceta
                                                                    ? undefined
                                                                    : 'dark'
                                                            }>
                                                            {plato.tieneReceta
                                                                ? 'Disponible'
                                                                : 'Sin receta'}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <Badge bg="secondary">
                                                            {
                                                                plato.ingredientesExpedidos
                                                            }
                                                            /
                                                            {
                                                                plato.ingredientesTotales
                                                            }
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </Accordion.Body>
                        </Accordion.Item>
                    ))}
                </Accordion>
            )}

            <ExpedicionRecetaModal
                comandaId={selectedComandaId}
                plato={selectedPlato}
                readOnly={rol === 'consultor'}
                show={showModal}
                onClose={() => {
                    setShowModal(false);
                    setSelectedPlato(null);
                    setSelectedComandaId(null);
                }}
                onResumenActualizado={(platoId, resumen) => {
                    if (!selectedComandaId) {
                        return;
                    }

                    updatePlatoResumen(selectedComandaId, platoId, resumen);
                }}
            />
        </Container>
    );
}
