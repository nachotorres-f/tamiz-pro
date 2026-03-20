'use client';

import { SalonContext } from '@/components/filtroPlatos';
import { Loading } from '@/components/loading';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useContext, useEffect, useMemo, useState } from 'react';
import type { CellObject, CellStyle, WorkSheet } from 'xlsx-js-style';
import {
    Button,
    Container,
    Form,
    OverlayTrigger,
    Table,
    Tooltip,
} from 'react-bootstrap';

interface Comanda {
    id: number;
    fecha: string;
    lugar: string;
    salon: string;
    tipo: string;
    nombre: string;
}

interface FilaPicking {
    platoPrincipal: string;
    platoPrincipalCodigo: string;
    subPlato: string;
    subPlatoCodigo: string;
    cantidadesPorComanda: Record<string, number>;
    cantidadesPorFechaPedido?: Record<string, number>;
    cantidadesPorFechaProduccion?: Record<string, number>;
}

interface PickingResponse {
    comandas: Comanda[];
    filas: FilaPicking[];
    fechasExportacion?: string[];
}

function formatearCantidad(cantidad: number) {
    if (cantidad === 0) return '-';

    const texto = cantidad.toFixed(10).replace(/\.?0+$/, '');

    return texto === '-0' ? '0' : texto;
}

function calcularAnchoColumna(valores: Array<string | number>): number {
    const maximoCaracteres = valores.reduce<number>((maximo, valor) => {
        const largo = String(valor ?? '')
            .split('\n')
            .reduce((maxLinea, linea) => Math.max(maxLinea, linea.length), 0);
        return Math.max(maximo, largo);
    }, 0);

    return maximoCaracteres + 2;
}

function normalizarFechaSinHora(fecha: string | Date): Date {
    const normalizada = new Date(fecha);
    normalizada.setHours(0, 0, 0, 0);
    return normalizada;
}

const estiloNumeroCentrado: CellStyle = {
    alignment: {
        horizontal: 'center',
        vertical: 'center',
    },
};

const estiloNumeroCentradoNegrita: CellStyle = {
    alignment: {
        horizontal: 'center',
        vertical: 'center',
    },
    font: {
        bold: true,
    },
};

const estiloNumeroProduccion: CellStyle = {
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
};

const estiloNumeroProduccionNegrita: CellStyle = {
    alignment: {
        horizontal: 'center',
        vertical: 'center',
    },
    font: {
        bold: true,
    },
    fill: {
        patternType: 'solid',
        fgColor: {
            rgb: 'E8F5E9',
        },
    },
};

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

function filtrarFilasPicking(
    filas: FilaPicking[],
    filtroPlato: string,
): FilaPicking[] {
    const filtro = filtroPlato.trim().toLowerCase();

    return filas.filter((fila) => {
        if (!filtro) return true;

        return (
            fila.platoPrincipal.toLowerCase().includes(filtro) ||
            fila.subPlato.toLowerCase().includes(filtro)
        );
    });
}

function obtenerComandasSemana(
    comandas: Comanda[],
    inicioRango: Date,
    finRango: Date,
) {
    return comandas
        .filter((comanda) => {
            const fechaComanda = normalizarFechaSinHora(comanda.fecha);
            return (
                fechaComanda.getTime() >= inicioRango.getTime() &&
                fechaComanda.getTime() <= finRango.getTime()
            );
        })
        .sort(
            (a, b) =>
                new Date(a.fecha).getTime() - new Date(b.fecha).getTime() ||
                a.id - b.id,
        );
}

function obtenerClaveFecha(fecha: string | Date): string {
    return format(normalizarFechaSinHora(fecha), 'yyyy-MM-dd');
}

function obtenerTituloComandaExcel(comanda: Comanda): string {
    return `${format(new Date(comanda.fecha), 'EEE dd/MM', {
        locale: es,
    })}\n${comanda.lugar}\n${comanda.salon}`;
}

function obtenerEtiquetaFechaExcel(fecha: string): string {
    return format(new Date(`${fecha}T00:00:00`), 'EEE dd/MM', {
        locale: es,
    });
}

function construirFilasExcelPicking(
    filas: FilaPicking[],
    comandas: Comanda[],
): Array<Record<string, string | number>> {
    return filas.map((fila) => {
        const total = comandas.reduce(
            (acumulado, comanda) =>
                acumulado +
                (fila.cantidadesPorComanda[String(comanda.id)] ?? 0),
            0,
        );
        const tieneAlgunaCantidad = comandas.some(
            (comanda) => fila.cantidadesPorComanda[String(comanda.id)] !== undefined,
        );

        const filaExportacion: Record<string, string | number> = {
            Plato: fila.platoPrincipal,
            Elaboracion: fila.subPlato,
            Total: tieneAlgunaCantidad ? total : '',
        };

        comandas.forEach((comanda) => {
            const cantidad = fila.cantidadesPorComanda[String(comanda.id)];
            filaExportacion[obtenerTituloComandaExcel(comanda)] =
                cantidad === undefined ? '' : cantidad;
        });

        return filaExportacion;
    });
}

function construirHojaPicking(
    filas: FilaPicking[],
    comandas: Comanda[],
    XLSX: typeof import('xlsx-js-style'),
): WorkSheet {
    const filasExcel = construirFilasExcelPicking(filas, comandas);
    const worksheet = XLSX.utils.json_to_sheet(filasExcel);
    worksheet['!rows'] = [{ hpt: 48 }];

    const columnas = Object.keys(filasExcel[0] ?? {});
    worksheet['!cols'] = columnas.map((columna, indice) => {
        const valoresColumna =
            indice < 3
                ? [
                      columna,
                      ...filasExcel.map((fila) => {
                          const valor = fila[columna] ?? '';
                          return typeof valor === 'number'
                              ? formatearCantidad(valor)
                              : valor;
                      }),
                  ]
                : [columna];

        const anchoBase = calcularAnchoColumna(valoresColumna);
        const limitesAncho = {
            min: indice <= 1 ? 14 : 0,
            max:
                indice === 0
                    ? 48
                    : indice === 1
                      ? 42
                      : Number.POSITIVE_INFINITY,
        };
        const anchoAjustado = Math.max(
            limitesAncho.min,
            Math.min(anchoBase, limitesAncho.max),
        );

        return {
            wch: anchoAjustado,
        };
    });

    const rango = worksheet['!ref']
        ? XLSX.utils.decode_range(worksheet['!ref'])
        : null;

    if (rango) {
        for (let c = 0; c <= rango.e.c; c += 1) {
            const direccionHeader = XLSX.utils.encode_cell({
                r: 0,
                c,
            });
            const headerCelda = worksheet[direccionHeader] as
                | CellObject
                | undefined;

            if (!headerCelda) continue;

            headerCelda.s = estiloHeaderOscuro;
        }

        for (let r = 1; r <= rango.e.r; r += 1) {
            for (let c = 2; c <= rango.e.c; c += 1) {
                const direccionCelda = XLSX.utils.encode_cell({
                    r,
                    c,
                });
                const celda = worksheet[direccionCelda] as
                    | CellObject
                    | undefined;

                if (!celda) continue;

                celda.s =
                    c === 2
                        ? estiloNumeroCentradoNegrita
                        : estiloNumeroCentrado;
            }
        }
    }

    return worksheet;
}

function construirHojaComparativa(
    filas: FilaPicking[],
    fechasExportacion: string[],
    XLSX: typeof import('xlsx-js-style'),
): WorkSheet {
    const encabezadoSuperior: Array<string | number> = [
        'Plato',
        'Elaboración',
        'Total Picking',
        'Total Producción',
    ];
    const encabezadoInferior: Array<string | number> = ['', '', '', ''];

    fechasExportacion.forEach((fecha) => {
        encabezadoSuperior.push(obtenerEtiquetaFechaExcel(fecha), '');
        encabezadoInferior.push('Pedido', 'Producción');
    });

    const filasExcel = filas.map((fila) => {
        const totalPicking = fechasExportacion.reduce(
            (acumulado, fecha) =>
                acumulado + (fila.cantidadesPorFechaPedido?.[fecha] ?? 0),
            0,
        );
        const totalProduccion = fechasExportacion.reduce(
            (acumulado, fecha) =>
                acumulado + (fila.cantidadesPorFechaProduccion?.[fecha] ?? 0),
            0,
        );
        const filaExcel: Array<string | number> = [
            fila.platoPrincipal,
            fila.subPlato,
            totalPicking > 0 ? totalPicking : '',
            totalProduccion > 0 ? totalProduccion : '',
        ];

        fechasExportacion.forEach((fecha) => {
            const pedido = fila.cantidadesPorFechaPedido?.[fecha] ?? 0;
            const produccion = fila.cantidadesPorFechaProduccion?.[fecha] ?? 0;

            filaExcel.push(pedido > 0 ? pedido : '');
            filaExcel.push(produccion > 0 ? produccion : '');
        });

        return filaExcel;
    });

    const worksheet = XLSX.utils.aoa_to_sheet([
        encabezadoSuperior,
        encabezadoInferior,
        ...filasExcel,
    ]);

    worksheet['!rows'] = [{ hpt: 28 }, { hpt: 22 }];
    worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
        { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
        { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
        { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } },
        ...fechasExportacion.map((_, indice) => ({
            s: { r: 0, c: 4 + indice * 2 },
            e: { r: 0, c: 5 + indice * 2 },
        })),
    ];
    worksheet['!cols'] = [
        {
            wch: Math.max(
                16,
                Math.min(
                    48,
                    calcularAnchoColumna([
                        'Plato',
                        ...filas.map((fila) => fila.platoPrincipal),
                    ]),
                ),
            ),
        },
        {
            wch: Math.max(
                16,
                Math.min(
                    42,
                    calcularAnchoColumna([
                        'Elaboración',
                        ...filas.map((fila) => fila.subPlato),
                    ]),
                ),
            ),
        },
        {
            wch: Math.max(
                14,
                calcularAnchoColumna([
                    'Total Picking',
                    ...filasExcel.map((fila) =>
                        typeof fila[2] === 'number' ? formatearCantidad(fila[2]) : '',
                    ),
                ]),
            ),
        },
        {
            wch: Math.max(
                16,
                calcularAnchoColumna([
                    'Total Producción',
                    ...filasExcel.map((fila) =>
                        typeof fila[3] === 'number' ? formatearCantidad(fila[3]) : '',
                    ),
                ]),
            ),
        },
        ...fechasExportacion.flatMap((fecha) => [
            {
                wch: Math.max(
                    10,
                    calcularAnchoColumna([
                        'Pedido',
                        ...filasExcel.map((fila) =>
                            typeof fila[4 + fechasExportacion.indexOf(fecha) * 2] ===
                            'number'
                                ? formatearCantidad(
                                      fila[4 + fechasExportacion.indexOf(fecha) * 2] as number,
                                  )
                                : '',
                        ),
                    ]),
                ),
            },
            {
                wch: Math.max(
                    12,
                    calcularAnchoColumna([
                        'Producción',
                        ...filasExcel.map((fila) =>
                            typeof fila[5 + fechasExportacion.indexOf(fecha) * 2] ===
                            'number'
                                ? formatearCantidad(
                                      fila[5 + fechasExportacion.indexOf(fecha) * 2] as number,
                                  )
                                : '',
                        ),
                    ]),
                ),
            },
        ]),
    ];

    const rango = worksheet['!ref']
        ? XLSX.utils.decode_range(worksheet['!ref'])
        : null;

    if (!rango) {
        return worksheet;
    }

    for (let r = 0; r <= 1; r += 1) {
        for (let c = 0; c <= rango.e.c; c += 1) {
            const direccionCelda = XLSX.utils.encode_cell({ r, c });
            const celda = worksheet[direccionCelda] as CellObject | undefined;

            if (!celda) continue;

            celda.s = estiloHeaderOscuro;
        }
    }

    for (let r = 2; r <= rango.e.r; r += 1) {
        const totalPickingCell = worksheet[
            XLSX.utils.encode_cell({ r, c: 2 })
        ] as CellObject | undefined;
        const totalProduccionCell = worksheet[
            XLSX.utils.encode_cell({ r, c: 3 })
        ] as CellObject | undefined;

        if (totalPickingCell) {
            totalPickingCell.s = estiloNumeroCentradoNegrita;
        }

        if (totalProduccionCell) {
            totalProduccionCell.s =
                typeof totalProduccionCell.v === 'number' &&
                totalProduccionCell.v > 0
                    ? estiloNumeroProduccionNegrita
                    : estiloNumeroCentradoNegrita;
        }

        for (let c = 4; c <= rango.e.c; c += 2) {
            const pedidoCell = worksheet[
                XLSX.utils.encode_cell({ r, c })
            ] as CellObject | undefined;
            const produccionCell = worksheet[
                XLSX.utils.encode_cell({ r, c: c + 1 })
            ] as CellObject | undefined;

            if (pedidoCell) {
                pedidoCell.s = estiloNumeroCentrado;
            }

            if (produccionCell) {
                produccionCell.s =
                    typeof produccionCell.v === 'number' && produccionCell.v > 0
                        ? estiloNumeroProduccion
                        : estiloNumeroCentrado;
            }
        }
    }

    return worksheet;
}

function TextoTruncadoTooltip({
    texto,
    tooltipId,
    maxWidth,
}: {
    texto: string;
    tooltipId: string;
    maxWidth: number;
}) {
    return (
        <OverlayTrigger
            placement="top"
            overlay={<Tooltip id={tooltipId}>{texto}</Tooltip>}>
            <span
                className="d-inline-block text-truncate align-middle"
                style={{
                    maxWidth,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                {texto}
            </span>
        </OverlayTrigger>
    );
}

export default function PickingPage() {
    const salon = useContext(SalonContext);

    const [data, setData] = useState<PickingResponse>({
        comandas: [],
        filas: [],
    });
    const [loading, setLoading] = useState(true);
    const [filtroPlato, setFiltroPlato] = useState('');

    useEffect(() => {
        let activo = true;
        setLoading(true);

        fetch('/api/picking?salon=' + salon)
            .then((res) => res.json())
            .then((payload: PickingResponse) => {
                if (!activo) return;
                setData(payload);
            })
            .catch(() => {
                if (!activo) return;
                setData({ comandas: [], filas: [] });
            })
            .finally(() => {
                if (!activo) return;
                setLoading(false);
            });

        return () => {
            activo = false;
        };
    }, [salon]);

    const inicioRango = useMemo(() => normalizarFechaSinHora(new Date()), []);
    const finRango = useMemo(() => addDays(inicioRango, 6), [inicioRango]);

    const comandasSemana = useMemo(
        () => obtenerComandasSemana(data.comandas, inicioRango, finRango),
        [data.comandas, inicioRango, finRango],
    );

    const filasFiltradas = useMemo(
        () => filtrarFilasPicking(data.filas, filtroPlato),
        [data.filas, filtroPlato],
    );

    if (loading) {
        return <Loading />;
    }

    const mostrarTabla =
        comandasSemana.length > 0 && filasFiltradas.length > 0;

    const exportarExcel = async () => {
        try {
            const response = await fetch(
                `/api/picking?salon=${salon}&incluirProduccion=true`,
            );

            if (!response.ok) {
                throw new Error('No se pudieron obtener los datos del picking');
            }

            const payload = (await response.json()) as PickingResponse;
            const comandasExportacion = obtenerComandasSemana(
                payload.comandas,
                inicioRango,
                finRango,
            );
            const filasExportacion = filtrarFilasPicking(
                payload.filas,
                filtroPlato,
            );
            const fechasExportacion =
                payload.fechasExportacion?.length
                    ? payload.fechasExportacion
                    : Array.from(
                          new Set(
                              comandasExportacion.map((comanda) =>
                                  obtenerClaveFecha(comanda.fecha),
                              ),
                          ),
                      ).sort();

            const xlsxModule = await import('xlsx-js-style');
            const XLSX: typeof import('xlsx-js-style') =
                'default' in xlsxModule
                    ? (xlsxModule.default as typeof import('xlsx-js-style'))
                    : xlsxModule;

            const workbook = XLSX.utils.book_new();
            const hojaPicking = construirHojaPicking(
                filasExportacion,
                comandasExportacion,
                XLSX,
            );
            const hojaComparativa = construirHojaComparativa(
                filasExportacion,
                fechasExportacion,
                XLSX,
            );

            XLSX.utils.book_append_sheet(workbook, hojaPicking, 'Picking');
            XLSX.utils.book_append_sheet(
                workbook,
                hojaComparativa,
                'Picking vs Producción',
            );
            XLSX.writeFile(workbook, 'picking.xlsx', {
                cellStyles: true,
            });
        } catch (error) {
            console.error('Error al exportar el picking:', error);
        }
    };

    return (
        <>
            <Container className="mt-5">
                <h2 className="text-center mb-4">Picking</h2>

                <Form.Group className="mb-4">
                    <Form.Label>Buscar Plato / Elaboracion</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Buscar plato o subplato..."
                        onChange={(e) => {
                            setFiltroPlato(e.target.value);
                        }}
                    />
                </Form.Group>

                <p className="text-muted mb-3">
                    {`Comandas: ${comandasSemana.length} | Filas: ${filasFiltradas.length}`}
                </p>

                <Button
                    className="mb-3 btn-success"
                    disabled={!mostrarTabla}
                    onClick={exportarExcel}>
                    Exportar a Excel
                </Button>

                {!mostrarTabla && (
                    <p className="text-muted">No hay datos para mostrar.</p>
                )}
            </Container>

            {mostrarTabla && (
                <div className="mt-2">
                    <div className="table-responsive">
                        <Table
                            bordered
                            striped
                            hover
                            size="sm"
                            className="mb-0 align-middle">
                            <thead className="table-dark sticky-top">
                                <tr>
                                    <th
                                        className="text-start"
                                        style={{ minWidth: 220 }}>
                                        Plato
                                    </th>
                                    <th
                                        className="text-start"
                                        style={{ minWidth: 220 }}>
                                        Elaboracion
                                    </th>
                                    <th
                                        className="text-center"
                                        style={{ minWidth: 120 }}>
                                        Total
                                    </th>
                                    {comandasSemana.map((comanda) => (
                                        <th
                                            className="align-middle text-center text-white"
                                            key={comanda.id}
                                            style={{ minWidth: 180 }}>
                                            <div className="text-white">
                                                {format(
                                                    new Date(comanda.fecha),
                                                    'EEE dd/MM',
                                                    {
                                                        locale: es,
                                                    },
                                                )}
                                            </div>
                                            <small className="d-block text-white">
                                                {comanda.lugar} -{' '}
                                                {comanda.salon}
                                            </small>
                                            <small className="d-block text-white">
                                                <TextoTruncadoTooltip
                                                    texto={`${comanda.nombre}`}
                                                    tooltipId={`tt-comanda-${comanda.id}`}
                                                    maxWidth={170}
                                                />
                                            </small>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filasFiltradas.map((fila, indexFila) => {
                                    const totalFila = comandasSemana.reduce(
                                        (acumulado, comanda) =>
                                            acumulado +
                                            (fila.cantidadesPorComanda[
                                                String(comanda.id)
                                            ] ?? 0),
                                        0,
                                    );

                                    return (
                                        <tr
                                            className="align-middle"
                                            key={`${fila.platoPrincipal}|${fila.subPlato}`}>
                                            <td
                                                className="text-start"
                                                style={{ maxWidth: 220 }}>
                                                <TextoTruncadoTooltip
                                                    texto={fila.platoPrincipal}
                                                    tooltipId={`tt-plato-${indexFila}`}
                                                    maxWidth={210}
                                                />
                                            </td>
                                            <td
                                                className="text-start"
                                                style={{ maxWidth: 220 }}>
                                                <TextoTruncadoTooltip
                                                    texto={fila.subPlato}
                                                    tooltipId={`tt-subplato-${indexFila}`}
                                                    maxWidth={210}
                                                />
                                            </td>
                                            <td className="text-center fw-semibold">
                                                {formatearCantidad(totalFila)}
                                            </td>
                                            {comandasSemana.map((comanda) => {
                                                const cantidad =
                                                    fila.cantidadesPorComanda[
                                                        String(comanda.id)
                                                    ] ?? 0;

                                                return (
                                                    <td
                                                        className="text-center"
                                                        key={`${fila.platoPrincipal}|${fila.subPlato}|${comanda.id}`}>
                                                        {formatearCantidad(
                                                            cantidad,
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </div>
                </div>
            )}
        </>
    );
}
