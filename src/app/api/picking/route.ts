import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';

interface RecetaNodo {
    codigo: string;
    subCodigo: string;
    porcionBruta: number;
}

interface AristaSubPlato {
    platoPadreCodigo: string;
    subPlatoCodigo: string;
    coeficiente: number;
}

interface ComandaConPlatos {
    Plato: {
        nombre: string;
        codigo: string;
        cantidad: number;
    }[];
    id: number;
    lugar: string;
    salon: string;
    tipo: string;
    fecha: Date;
    nombre: string;
}

interface PlatoDesglosado {
    platoPrincipal: string;
    platoPrincipalCodigo: string;
    cantidad: number;
    subPlatos: {
        nombre: string;
        codigo: string;
        cantidad: number;
    }[];
}

interface ComandaDesglosada {
    id: number;
    fecha: Date;
    lugar: string;
    salon: string;
    tipo: string;
    nombre: string;
    platos: PlatoDesglosado[];
}

interface FilaPicking {
    platoPrincipal: string;
    platoPrincipalCodigo: string;
    subPlato: string;
    subPlatoCodigo: string;
    cantidadesPorComanda: Record<string, number>;
}

const SUBPLATOS_EXCLUIDOS_POR_PLATO: Record<string, Set<string>> = {
    'mesa dulce': new Set([
        'helado para bochear + insumos (x pax)',
        'patisserie rut',
        'tortas rut',
    ]),
    'mesa dulce menores rut': new Set([
        'carro de plaza',
        'helado para bochear + insumos (x pax)',
        'patisserie rut',
    ]),
};

function normalizarTexto(texto: string | null | undefined): string {
    return (texto ?? '').trim();
}

function normalizarClaveFiltro(texto: string): string {
    return normalizarTexto(texto).toLocaleLowerCase('es');
}

function debeExcluirSubPlato(platoPrincipal: string, subPlato: string): boolean {
    const subPlatosExcluidos = SUBPLATOS_EXCLUIDOS_POR_PLATO[
        normalizarClaveFiltro(platoPrincipal)
    ];

    if (!subPlatosExcluidos) {
        return false;
    }

    return subPlatosExcluidos.has(normalizarClaveFiltro(subPlato));
}

function redondearCantidad(valor: number): number {
    if (!Number.isFinite(valor)) {
        return 0;
    }

    return Number(valor.toFixed(4));
}

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const salon: string = searchParams.get('salon') || 'A';

    try {
        const lugares = ['El Central', 'La Rural'];
        const usarNotIn = salon === 'A';
        const inicioRango = new Date();
        inicioRango.setHours(0, 0, 0, 0);
        const finRangoExclusivo = addDays(inicioRango, 7);

        const [comandas, recetasIndice] = await Promise.all([
            prisma.comanda.findMany({
                where: {
                    fecha: {
                        gte: inicioRango,
                        lt: finRangoExclusivo,
                    },
                    lugar: usarNotIn ? { notIn: lugares } : { in: lugares },
                },
                orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
                include: { Plato: true },
            }),
            prisma.receta.findMany({
                select: {
                    id: true,
                    codigo: true,
                    nombreProducto: true,
                    subCodigo: true,
                    descripcion: true,
                },
                orderBy: {
                    id: 'asc',
                },
            }),
        ]);

        const comandasTipadas = comandas as ComandaConPlatos[];

        if (comandasTipadas.length === 0) {
            await logAudit({
                modulo: 'picking',
                accion: 'consultar_picking',
                ruta: '/api/picking',
                metodo: 'GET',
                resumen: `Consulta picking sin comandas para salon ${salon}`,
                detalle: { salon, comandas: 0, filas: 0 },
            });

            return NextResponse.json({
                comandas: [],
                filas: [],
            });
        }

        const codigoPorNombreProducto = new Map<string, string>();
        const nombrePorCodigo = new Map<string, string>();

        for (const receta of recetasIndice) {
            const codigoPadre = normalizarTexto(receta.codigo);
            const subCodigo = normalizarTexto(receta.subCodigo);
            const nombreProducto = normalizarTexto(receta.nombreProducto);
            const descripcion = normalizarTexto(receta.descripcion);

            if (codigoPadre && !nombrePorCodigo.has(codigoPadre)) {
                nombrePorCodigo.set(codigoPadre, nombreProducto || codigoPadre);
            }

            if (subCodigo && !nombrePorCodigo.has(subCodigo)) {
                nombrePorCodigo.set(subCodigo, descripcion || subCodigo);
            }

            const claveNombre = normalizarClaveFiltro(nombreProducto);
            if (
                claveNombre &&
                codigoPadre &&
                !codigoPorNombreProducto.has(claveNombre)
            ) {
                codigoPorNombreProducto.set(claveNombre, codigoPadre);
            }
        }

        const codigosPlatosComanda = new Set<string>();

        for (const comanda of comandasTipadas) {
            for (const plato of comanda.Plato) {
                const codigoPlato =
                    normalizarTexto(plato.codigo) ||
                    codigoPorNombreProducto.get(normalizarClaveFiltro(plato.nombre)) ||
                    '';

                if (codigoPlato) {
                    codigosPlatosComanda.add(codigoPlato);
                    if (!nombrePorCodigo.has(codigoPlato)) {
                        nombrePorCodigo.set(codigoPlato, normalizarTexto(plato.nombre));
                    }
                }
            }
        }

        if (codigosPlatosComanda.size === 0) {
            await logAudit({
                modulo: 'picking',
                accion: 'consultar_picking',
                ruta: '/api/picking',
                metodo: 'GET',
                estado: 'warning',
                resumen: `Comandas sin códigos para salon ${salon}`,
                detalle: {
                    salon,
                    comandas: comandasTipadas.length,
                    filas: 0,
                },
            });

            return NextResponse.json({
                comandas: [],
                filas: [],
            });
        }

        const grafoRecetas = await construirGrafoRecetas(
            codigosPlatosComanda,
            nombrePorCodigo,
        );
        const cacheCoeficientes = new Map<string, Map<string, AristaSubPlato>>();
        const filasMap = new Map<string, FilaPicking>();

        const comandasDesglosadas: ComandaDesglosada[] = comandasTipadas.map(
            (comanda) => {
                const platosAgrupados = agruparPlatosPorCodigo(
                    comanda.Plato,
                    codigoPorNombreProducto,
                    nombrePorCodigo,
                );

                const platos: PlatoDesglosado[] = Array.from(platosAgrupados.values())
                    .map(({ codigo, nombre, cantidad }) => {
                        const aristasSubPlatos = obtenerAristasSubPlatos(
                            codigo,
                            grafoRecetas,
                            cacheCoeficientes,
                        );

                    const subPlatos = Array.from(aristasSubPlatos.values())
                        .map(({ platoPadreCodigo, subPlatoCodigo, coeficiente }) => {
                            const platoPadreNombre =
                                nombrePorCodigo.get(platoPadreCodigo) ||
                                platoPadreCodigo;
                            const subPlatoNombre =
                                nombrePorCodigo.get(subPlatoCodigo) || subPlatoCodigo;

                            if (debeExcluirSubPlato(nombre, subPlatoNombre)) {
                                return null;
                            }

                            const cantidadSubPlato = redondearCantidad(
                                cantidad * coeficiente,
                            );
                            if (cantidadSubPlato === 0) {
                                return null;
                            }

                            const keyFila = `${platoPadreCodigo}|||${subPlatoCodigo}`;
                            if (!filasMap.has(keyFila)) {
                                filasMap.set(keyFila, {
                                    platoPrincipal: platoPadreNombre,
                                    platoPrincipalCodigo: platoPadreCodigo,
                                    subPlato: subPlatoNombre,
                                    subPlatoCodigo,
                                    cantidadesPorComanda: {},
                                });
                            }

                            const fila = filasMap.get(keyFila)!;
                            const keyComanda = String(comanda.id);
                            fila.cantidadesPorComanda[keyComanda] = redondearCantidad(
                                (fila.cantidadesPorComanda[keyComanda] ?? 0) +
                                    cantidadSubPlato,
                            );

                            if (platoPadreCodigo !== codigo) {
                                return null;
                            }

                            return {
                                nombre: subPlatoNombre,
                                codigo: subPlatoCodigo,
                                cantidad: cantidadSubPlato,
                            };
                        })
                        .filter(
                            (
                                item,
                            ): item is {
                                nombre: string;
                                codigo: string;
                                cantidad: number;
                            } => item !== null,
                        )
                        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

                    return {
                        platoPrincipal: nombre,
                        platoPrincipalCodigo: codigo,
                        cantidad: redondearCantidad(cantidad),
                        subPlatos,
                    };
                })
                    .sort((a, b) =>
                        a.platoPrincipal.localeCompare(b.platoPrincipal, 'es'),
                    );

                return {
                    id: comanda.id,
                    fecha: comanda.fecha,
                    lugar: comanda.lugar,
                    salon: comanda.salon,
                    tipo: comanda.tipo,
                    nombre: comanda.nombre,
                    platos,
                };
            },
        );

        const filas = ordenarFilasJerarquicamente(
            Array.from(filasMap.values()),
            codigosPlatosComanda,
        );

        await logAudit({
            modulo: 'picking',
            accion: 'consultar_picking',
            ruta: '/api/picking',
            metodo: 'GET',
            resumen: `Consulta picking para salon ${salon}`,
            detalle: {
                salon,
                comandas: comandasDesglosadas.length,
                filas: filas.length,
            },
        });

        return NextResponse.json({
            comandas: comandasDesglosadas,
            filas,
        });
    } catch (error) {
        await logAudit({
            modulo: 'picking',
            accion: 'consultar_picking',
            ruta: '/api/picking',
            metodo: 'GET',
            estado: 'error',
            resumen: 'Error consultando picking',
            detalle: {
                salon,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al consultar picking' },
            { status: 500 },
        );
    }
}

async function construirGrafoRecetas(
    codigosIniciales: Set<string>,
    nombrePorCodigo: Map<string, string>,
): Promise<Map<string, RecetaNodo[]>> {
    const grafoRecetas = new Map<string, RecetaNodo[]>();
    const visitados = new Set<string>();
    const pendientes = Array.from(codigosIniciales);

    while (pendientes.length > 0) {
        const codigosNoVisitados = pendientes
            .splice(0, 100)
            .map((codigo) => normalizarTexto(codigo))
            .filter((codigo): codigo is string => Boolean(codigo))
            .filter((codigo) => !visitados.has(codigo));

        if (codigosNoVisitados.length === 0) {
            continue;
        }

        codigosNoVisitados.forEach((codigo) => visitados.add(codigo));

        const recetas = await prisma.receta.findMany({
            where: {
                codigo: {
                    in: codigosNoVisitados,
                },
                tipo: 'PT',
            },
            select: {
                codigo: true,
                subCodigo: true,
                nombreProducto: true,
                descripcion: true,
                porcionBruta: true,
            },
        });

        for (const receta of recetas) {
            const codigo = normalizarTexto(receta.codigo);
            const subCodigo = normalizarTexto(receta.subCodigo);
            const nombreProducto = normalizarTexto(receta.nombreProducto);
            const descripcion = normalizarTexto(receta.descripcion);
            const porcionBruta = Number(receta.porcionBruta);

            if (!codigo || !subCodigo) {
                continue;
            }

            if (!Number.isFinite(porcionBruta) || porcionBruta === 0) {
                continue;
            }

            if (nombreProducto && !nombrePorCodigo.has(codigo)) {
                nombrePorCodigo.set(codigo, nombreProducto);
            }

            if (descripcion && !nombrePorCodigo.has(subCodigo)) {
                nombrePorCodigo.set(subCodigo, descripcion);
            }

            if (!grafoRecetas.has(codigo)) {
                grafoRecetas.set(codigo, []);
            }

            grafoRecetas.get(codigo)!.push({
                codigo,
                subCodigo,
                porcionBruta,
            });

            if (!visitados.has(subCodigo)) {
                pendientes.push(subCodigo);
            }
        }
    }

    return grafoRecetas;
}

function obtenerAristasSubPlatos(
    codigoPlatoPrincipal: string,
    grafoRecetas: Map<string, RecetaNodo[]>,
    cache: Map<string, Map<string, AristaSubPlato>>,
): Map<string, AristaSubPlato> {
    if (cache.has(codigoPlatoPrincipal)) {
        return cache.get(codigoPlatoPrincipal)!;
    }

    const aristas = new Map<string, AristaSubPlato>();
    const pila: Array<{ codigo: string; factor: number; camino: Set<string> }> = [
        {
            codigo: codigoPlatoPrincipal,
            factor: 1,
            camino: new Set([codigoPlatoPrincipal]),
        },
    ];

    while (pila.length > 0) {
        const { codigo, factor, camino } = pila.pop()!;
        const recetas = grafoRecetas.get(codigo) ?? [];

        for (const receta of recetas) {
            if (camino.has(receta.subCodigo)) {
                continue;
            }

            const factorSubPlato = factor * receta.porcionBruta;

            if (!Number.isFinite(factorSubPlato) || factorSubPlato === 0) {
                continue;
            }

            const keyArista = `${codigo}|||${receta.subCodigo}`;
            if (!aristas.has(keyArista)) {
                aristas.set(keyArista, {
                    platoPadreCodigo: codigo,
                    subPlatoCodigo: receta.subCodigo,
                    coeficiente: 0,
                });
            }
            const arista = aristas.get(keyArista)!;
            arista.coeficiente += factorSubPlato;

            const nuevoCamino = new Set(camino);
            nuevoCamino.add(receta.subCodigo);
            pila.push({
                codigo: receta.subCodigo,
                factor: factorSubPlato,
                camino: nuevoCamino,
            });
        }
    }

    cache.set(codigoPlatoPrincipal, aristas);
    return aristas;
}

function agruparPlatosPorCodigo(
    platos: { nombre: string; codigo: string; cantidad: number }[],
    codigoPorNombreProducto: Map<string, string>,
    nombrePorCodigo: Map<string, string>,
): Map<string, { codigo: string; nombre: string; cantidad: number }> {
    const platosAgrupados = new Map<
        string,
        { codigo: string; nombre: string; cantidad: number }
    >();

    for (const plato of platos) {
        const codigo =
            normalizarTexto(plato.codigo) ||
            codigoPorNombreProducto.get(normalizarClaveFiltro(plato.nombre)) ||
            '';
        const cantidad = Number(plato.cantidad);

        if (!codigo || !Number.isFinite(cantidad) || cantidad === 0) {
            continue;
        }

        const existente = platosAgrupados.get(codigo);
        platosAgrupados.set(codigo, {
            codigo,
            nombre:
                existente?.nombre ||
                nombrePorCodigo.get(codigo) ||
                normalizarTexto(plato.nombre) ||
                codigo,
            cantidad: (existente?.cantidad ?? 0) + cantidad,
        });
    }

    return platosAgrupados;
}

function ordenarFilasJerarquicamente(
    filas: FilaPicking[],
    platosRaizCodigos: Set<string>,
): FilaPicking[] {
    const filaPorClave = new Map<string, FilaPicking>();
    const hijosPorPadre = new Map<string, Set<string>>();

    for (const fila of filas) {
        const keyFila = `${fila.platoPrincipalCodigo}|||${fila.subPlatoCodigo}`;
        filaPorClave.set(keyFila, fila);

        if (!hijosPorPadre.has(fila.platoPrincipalCodigo)) {
            hijosPorPadre.set(fila.platoPrincipalCodigo, new Set<string>());
        }

        hijosPorPadre.get(fila.platoPrincipalCodigo)!.add(fila.subPlatoCodigo);
    }

    const filasOrdenadas: FilaPicking[] = [];
    const filasVisitadas = new Set<string>();

    const recorrerArbol = (padreCodigo: string, camino: Set<string>) => {
        if (camino.has(padreCodigo)) {
            return;
        }

        const hijos = Array.from(hijosPorPadre.get(padreCodigo) ?? []).sort((a, b) =>
            a.localeCompare(b, 'es'),
        );

        if (hijos.length === 0) {
            return;
        }

        const nuevoCamino = new Set(camino);
        nuevoCamino.add(padreCodigo);

        for (const hijoCodigo of hijos) {
            const keyFila = `${padreCodigo}|||${hijoCodigo}`;

            if (!filasVisitadas.has(keyFila)) {
                const fila = filaPorClave.get(keyFila);
                if (fila) {
                    filasOrdenadas.push(fila);
                    filasVisitadas.add(keyFila);
                }
            }

            recorrerArbol(hijoCodigo, nuevoCamino);
        }
    };

    const platosRaizOrdenados = Array.from(platosRaizCodigos).sort((a, b) =>
        a.localeCompare(b, 'es'),
    );

    for (const platoRaizCodigo of platosRaizOrdenados) {
        recorrerArbol(platoRaizCodigo, new Set<string>());
    }

    const filasRestantes = filas
        .filter((fila) => {
            const keyFila = `${fila.platoPrincipalCodigo}|||${fila.subPlatoCodigo}`;
            return !filasVisitadas.has(keyFila);
        })
        .sort(
            (a, b) =>
                a.platoPrincipal.localeCompare(b.platoPrincipal, 'es') ||
                a.subPlato.localeCompare(b.subPlato, 'es'),
        );

    return [...filasOrdenadas, ...filasRestantes];
}
