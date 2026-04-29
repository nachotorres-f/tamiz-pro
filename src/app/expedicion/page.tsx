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
import type { CellObject, CellStyle, WorkSheet } from 'xlsx-js-style';

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

const estiloHeaderOscuro: CellStyle = {
    alignment: {
        horizontal: 'center',
        vertical: 'center',
        wrapText: true,
    },
    fill: {
        patternType: 'solid',
        fgColor: {
            rgb: '404040',
        },
    },
    font: {
        bold: true,
        color: {
            rgb: 'FFFFFF',
        },
    },
};

const estiloNumeroCentrado: CellStyle = {
    alignment: {
        horizontal: 'center',
        vertical: 'center',
    },
};

const estiloExpedidosPendiente: CellStyle = {
    alignment: {
        horizontal: 'center',
        vertical: 'center',
    },
    fill: {
        patternType: 'solid',
        fgColor: {
            rgb: 'FDECEC',
        },
    },
    font: {
        color: {
            rgb: 'B71C1C',
        },
    },
};

const estiloExpedidosParcial: CellStyle = {
    alignment: {
        horizontal: 'center',
        vertical: 'center',
    },
    fill: {
        patternType: 'solid',
        fgColor: {
            rgb: 'FFF4CC',
        },
    },
    font: {
        color: {
            rgb: '8A6D00',
        },
    },
};

const estiloExpedidosCompleto: CellStyle = {
    alignment: {
        horizontal: 'center',
        vertical: 'center',
    },
    fill: {
        patternType: 'solid',
        fgColor: {
            rgb: 'E8F5E9',
        },
    },
    font: {
        color: {
            rgb: '1B5E20',
        },
    },
};

function calcularAnchoColumna(valores: Array<string | number>): number {
    const maximoCaracteres = valores.reduce<number>((maximo, valor) => {
        const largo = String(valor ?? '')
            .split('\n')
            .reduce((maxLinea, linea) => Math.max(maxLinea, linea.length), 0);

        return Math.max(maximo, largo);
    }, 0);

    return maximoCaracteres + 2;
}

function construirHojaExpedicion(
    comandas: ExpedicionComandaDetalle[],
    XLSX: typeof import('xlsx-js-style'),
): WorkSheet {
    const encabezado: Array<string | number> = [
        'Comanda',
        'Lugar',
        'Salon',
        'Fecha',
        'Codigo',
        'PT / MP',
        'Cantidad',
        'Tiene receta',
        'Expedidos',
        'Ingredientes',
    ];

    const filas = comandas.flatMap((detalle) =>
        detalle.platos.map((item) => [
            detalle.comanda.nombre,
            detalle.comanda.lugar,
            detalle.comanda.salon,
            format(new Date(detalle.comanda.fecha), 'dd/MM/yyyy'),
            item.codigo || '',
            item.nombre,
            item.cantidad,
            item.tieneReceta ? 'Sí' : 'No',
            item.ingredientesExpedidos,
            item.ingredientesTotales,
        ]),
    );

    const worksheet = XLSX.utils.aoa_to_sheet([encabezado, ...filas]);
    worksheet['!rows'] = [{ hpt: 28 }];
    worksheet['!cols'] = encabezado.map((columna, indice) => {
        const valores =
            indice === 6 || indice === 8 || indice === 9
                ? [
                      columna,
                      ...filas.map((fila) => {
                          const valor = fila[indice] ?? '';
                          return typeof valor === 'number'
                              ? formatearCantidad(valor)
                              : valor;
                      }),
                  ]
                : [columna, ...filas.map((fila) => fila[indice] ?? '')];

        const anchoBase = calcularAnchoColumna(valores);

        return {
            wch: Math.max(
                indice === 5 ? 24 : indice === 0 ? 20 : 10,
                Math.min(indice === 5 ? 48 : indice === 0 ? 32 : 20, anchoBase),
            ),
        };
    });

    const rango = worksheet['!ref']
        ? XLSX.utils.decode_range(worksheet['!ref'])
        : null;

    if (!rango) {
        return worksheet;
    }

    for (let c = 0; c <= rango.e.c; c += 1) {
        const headerCell = worksheet[XLSX.utils.encode_cell({ r: 0, c })] as
            | CellObject
            | undefined;

        if (headerCell) {
            headerCell.s = estiloHeaderOscuro;
        }
    }

    for (let r = 1; r <= rango.e.r; r += 1) {
        for (const c of [6, 8, 9]) {
            const cell = worksheet[XLSX.utils.encode_cell({ r, c })] as
                | CellObject
                | undefined;

            if (cell) {
                cell.s = estiloNumeroCentrado;
            }
        }

        const expedidosCell = worksheet[XLSX.utils.encode_cell({ r, c: 8 })] as
            | CellObject
            | undefined;
        const ingredientesCell = worksheet[
            XLSX.utils.encode_cell({ r, c: 9 })
        ] as CellObject | undefined;

        if (expedidosCell && ingredientesCell) {
            const expedidos = Number(expedidosCell.v ?? 0);
            const ingredientes = Number(ingredientesCell.v ?? 0);

            expedidosCell.s =
                expedidos <= 0
                    ? estiloExpedidosPendiente
                    : expedidos >= ingredientes && ingredientes > 0
                      ? estiloExpedidosCompleto
                      : estiloExpedidosParcial;
        }
    }

    return worksheet;
}

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
                    throw new Error(
                        'No se pudo cargar la agenda de expedición.',
                    );
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
                setError(
                    'No se pudo cargar la lista de comandas de expedición.',
                );
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
        import('xlsx-js-style').then((xlsxModule) => {
            const XLSX: typeof import('xlsx-js-style') =
                'default' in xlsxModule
                    ? (xlsxModule.default as typeof import('xlsx-js-style'))
                    : xlsxModule;
            const worksheet = construirHojaExpedicion(comandas, XLSX);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Expedicion');
            XLSX.writeFile(workbook, 'expedicion.xlsx', {
                cellStyles: true,
            });
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
                <Accordion
                    alwaysOpen
                    className="mb-3">
                    {comandas.map((detalle, index) => (
                        <Accordion.Item
                            eventKey={String(index)}
                            key={detalle.comanda.id}>
                            <Accordion.Header>
                                <span className="me-2 fw-semibold">
                                    {detalle.comanda.nombre}
                                </span>
                                <span className="text-body-secondary">
                                    {detalle.comanda.lugar} |{' '}
                                    {detalle.comanda.salon} |{' '}
                                    {formatearFechaTitulo(
                                        detalle.comanda.fecha,
                                    )}
                                </span>
                            </Accordion.Header>
                            <Accordion.Body>
                                <div className="d-flex gap-2 flex-wrap mb-3">
                                    <Badge bg="dark">
                                        Comanda #{detalle.comanda.id}
                                    </Badge>
                                    <Badge bg="secondary">
                                        Invitados{' '}
                                        {detalle.comanda.cantidadInvitados}
                                    </Badge>
                                    <Badge bg="info">
                                        PT / MP {detalle.platos.length}
                                    </Badge>
                                </div>

                                {detalle.platos.length === 0 ? (
                                    <Alert
                                        variant="warning"
                                        className="mb-0">
                                        Esta comanda no tiene PT cargados.
                                    </Alert>
                                ) : (
                                    <Table
                                        responsive
                                        hover
                                        className="mb-0 align-middle">
                                        <thead>
                                            <tr>
                                                <th>Código</th>
                                                <th>PT / MP</th>
                                                <th>Cantidad</th>
                                                <th>Receta</th>
                                                <th>Expedición</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detalle.platos.map((plato) => (
                                                <tr key={plato.platoId}>
                                                    <td>
                                                        {plato.codigo || '-'}
                                                    </td>
                                                    <td>
                                                        <Button
                                                            variant="link"
                                                            className="p-0 text-start fw-semibold text-decoration-none"
                                                            onClick={() => {
                                                                setSelectedComandaId(
                                                                    detalle
                                                                        .comanda
                                                                        .id,
                                                                );
                                                                setSelectedPlato(
                                                                    plato,
                                                                );
                                                                setShowModal(
                                                                    true,
                                                                );
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
