'use client';

import { SalonContext } from '@/components/filtroPlatos';
import { Loading } from '@/components/loading';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useContext, useEffect, useMemo, useState } from 'react';
import type { CellObject, CellStyle } from 'xlsx-js-style';
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
    subPlato: string;
    cantidadesPorComanda: Record<string, number>;
}

interface PickingResponse {
    comandas: Comanda[];
    filas: FilaPicking[];
}

function formatearCantidad(cantidad: number) {
    if (cantidad === 0) return '-';

    const texto = cantidad.toFixed(10).replace(/\.?0+$/, '');

    return texto === '-0' ? '0' : texto;
}

function calcularAnchoColumna(valores: Array<string | number>): number {
    const maximoCaracteres = valores.reduce<number>((maximo, valor) => {
        const largo = String(valor ?? '').length;
        return Math.max(maximo, largo);
    }, 0);

    return maximoCaracteres + 2;
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

const estiloHeaderNegrita: CellStyle = {
    font: {
        bold: true,
    },
};

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

    const comandasOrdenadas = useMemo(
        () =>
            [...data.comandas].sort(
                (a, b) =>
                    new Date(a.fecha).getTime() - new Date(b.fecha).getTime() ||
                    a.id - b.id,
            ),
        [data.comandas],
    );

    const filasFiltradas = useMemo(() => {
        const filtro = filtroPlato.trim().toLowerCase();

        return data.filas.filter((fila) => {
            if (!filtro) return true;

            return (
                fila.platoPrincipal.toLowerCase().includes(filtro) ||
                fila.subPlato.toLowerCase().includes(filtro)
            );
        });
    }, [data.filas, filtroPlato]);

    if (loading) {
        return <Loading />;
    }

    const mostrarTabla =
        comandasOrdenadas.length > 0 && filasFiltradas.length > 0;

    const exportarExcel = () => {
        const filasExcel = filasFiltradas.map((fila) => {
            const total = comandasOrdenadas.reduce(
                (acumulado, comanda) =>
                    acumulado +
                    (fila.cantidadesPorComanda[String(comanda.id)] ?? 0),
                0,
            );
            const tieneAlgunaCantidad = comandasOrdenadas.some(
                (comanda) =>
                    fila.cantidadesPorComanda[String(comanda.id)] !== undefined,
            );

            const filaExportacion: Record<string, string | number> = {
                Plato: fila.platoPrincipal,
                Elaboracion: fila.subPlato,
                Total: tieneAlgunaCantidad ? total : '',
            };

            comandasOrdenadas.forEach((comanda) => {
                const claveComanda = `${format(new Date(comanda.fecha), 'EEE dd/MM', {
                    locale: es,
                })} | ${comanda.lugar} - ${comanda.salon}`;
                const cantidad =
                    fila.cantidadesPorComanda[String(comanda.id)];
                filaExportacion[claveComanda] =
                    cantidad === undefined ? '' : cantidad;
            });

            return filaExportacion;
        });

        import('xlsx-js-style').then((xlsxModule) => {
            const XLSX: typeof import('xlsx-js-style') =
                'default' in xlsxModule
                    ? (xlsxModule.default as typeof import('xlsx-js-style'))
                    : xlsxModule;
            const worksheet = XLSX.utils.json_to_sheet(filasExcel);

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

                return {
                    wch: anchoBase,
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

                    headerCelda.s = estiloHeaderNegrita;
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

            const workbook = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Picking');
            XLSX.writeFile(workbook, 'picking.xlsx', {
                cellStyles: true,
            });
        });
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
                    {`Comandas: ${comandasOrdenadas.length} | Filas: ${filasFiltradas.length}`}
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
                                    {comandasOrdenadas.map((comanda) => (
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
                                    const totalFila = comandasOrdenadas.reduce(
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
                                            {comandasOrdenadas.map((comanda) => {
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
