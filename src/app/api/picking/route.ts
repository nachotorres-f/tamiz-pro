import { prisma } from '@/lib/prisma';
import { endOfWeek, startOfWeek } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

interface RecetaNodo {
    nombreProducto: string;
    descripcion: string;
    porcionBruta: number;
}

interface ComandaConPlatos {
    Plato: {
        nombre: string;
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
    cantidad: number;
    subPlatos: {
        nombre: string;
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
    subPlato: string;
    cantidadesPorComanda: Record<string, number>;
}

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const salon: string = searchParams.get('salon') || 'A';

    const lugares = ['El Central', 'La Rural'];
    const usarNotIn = salon === 'A';

    const comandas = (await prisma.comanda.findMany({
        where: {
            fecha: {
                gte: startOfWeek(new Date(), { weekStartsOn: 1 }),
                lt: endOfWeek(new Date(), { weekStartsOn: 1 }),
            },
            lugar: usarNotIn ? { notIn: lugares } : { in: lugares },
        },
        orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
        include: { Plato: true },
    })) as ComandaConPlatos[];

    if (comandas.length === 0) {
        return NextResponse.json({
            comandas: [],
            filas: [],
        });
    }

    const nombresPlatos = new Set<string>();
    for (const comanda of comandas) {
        for (const plato of comanda.Plato) {
            const nombrePlato = normalizarTexto(plato.nombre);
            if (nombrePlato) {
                nombresPlatos.add(nombrePlato);
            }
        }
    }

    const grafoRecetas = await construirGrafoRecetas(nombresPlatos);
    const cacheCoeficientes = new Map<string, Map<string, number>>();
    const filasMap = new Map<string, FilaPicking>();

    const comandasDesglosadas: ComandaDesglosada[] = comandas.map((comanda) => {
        const platosAgrupados = agruparPlatosPorNombre(comanda.Plato);

        const platos: PlatoDesglosado[] = Array.from(platosAgrupados.entries())
            .map(([platoPrincipal, cantidadPlato]) => {
                const coeficientesSubPlatos = obtenerCoeficientesSubPlatos(
                    platoPrincipal,
                    grafoRecetas,
                    cacheCoeficientes,
                );

                const subPlatos = Array.from(coeficientesSubPlatos.entries())
                    .map(([subPlato, coeficiente]) => {
                        const cantidadSubPlato = redondearCantidad(
                            cantidadPlato * coeficiente,
                        );
                        if (cantidadSubPlato === 0) {
                            return null;
                        }

                        const keyFila = `${platoPrincipal}|||${subPlato}`;
                        if (!filasMap.has(keyFila)) {
                            filasMap.set(keyFila, {
                                platoPrincipal,
                                subPlato,
                                cantidadesPorComanda: {},
                            });
                        }

                        const fila = filasMap.get(keyFila)!;
                        const keyComanda = String(comanda.id);
                        fila.cantidadesPorComanda[keyComanda] =
                            redondearCantidad(
                                (fila.cantidadesPorComanda[keyComanda] ?? 0) +
                                    cantidadSubPlato,
                            );

                        return {
                            nombre: subPlato,
                            cantidad: cantidadSubPlato,
                        };
                    })
                    .filter(
                        (
                            item,
                        ): item is {
                            nombre: string;
                            cantidad: number;
                        } => item !== null,
                    )
                    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

                return {
                    platoPrincipal,
                    cantidad: redondearCantidad(cantidadPlato),
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
    });

    const filas = Array.from(filasMap.values()).sort(
        (a, b) =>
            a.platoPrincipal.localeCompare(b.platoPrincipal, 'es') ||
            a.subPlato.localeCompare(b.subPlato, 'es'),
    );

    return NextResponse.json({
        comandas: comandasDesglosadas,
        filas,
    });
}

async function construirGrafoRecetas(
    nombresIniciales: Set<string>,
): Promise<Map<string, RecetaNodo[]>> {
    const grafoRecetas = new Map<string, RecetaNodo[]>();
    const visitados = new Set<string>();
    const pendientes = Array.from(nombresIniciales);

    while (pendientes.length > 0) {
        const nombresNoVisitados = pendientes
            .splice(0, 100)
            .map((nombre) => normalizarTexto(nombre))
            .filter((nombre): nombre is string => Boolean(nombre))
            .filter((nombre) => !visitados.has(nombre));

        if (nombresNoVisitados.length === 0) {
            continue;
        }

        nombresNoVisitados.forEach((nombre) => visitados.add(nombre));

        const recetas = await prisma.receta.findMany({
            where: {
                nombreProducto: {
                    in: nombresNoVisitados,
                },
                tipo: 'PT',
            },
            select: {
                nombreProducto: true,
                descripcion: true,
                porcionBruta: true,
            },
        });

        for (const receta of recetas) {
            const nombreProducto = normalizarTexto(receta.nombreProducto);
            const descripcion = normalizarTexto(receta.descripcion);
            const porcionBruta = Number(receta.porcionBruta);

            if (!nombreProducto || !descripcion) {
                continue;
            }

            if (!Number.isFinite(porcionBruta) || porcionBruta === 0) {
                continue;
            }

            if (!grafoRecetas.has(nombreProducto)) {
                grafoRecetas.set(nombreProducto, []);
            }

            grafoRecetas.get(nombreProducto)!.push({
                nombreProducto,
                descripcion,
                porcionBruta,
            });

            if (!visitados.has(descripcion)) {
                pendientes.push(descripcion);
            }
        }
    }

    return grafoRecetas;
}

function obtenerCoeficientesSubPlatos(
    platoPrincipal: string,
    grafoRecetas: Map<string, RecetaNodo[]>,
    cache: Map<string, Map<string, number>>,
): Map<string, number> {
    if (cache.has(platoPrincipal)) {
        return cache.get(platoPrincipal)!;
    }

    const coeficientes = new Map<string, number>();
    const pila: Array<{ nombre: string; factor: number; camino: Set<string> }> =
        [
            {
                nombre: platoPrincipal,
                factor: 1,
                camino: new Set([platoPrincipal]),
            },
        ];

    while (pila.length > 0) {
        const { nombre, factor, camino } = pila.pop()!;
        const recetas = grafoRecetas.get(nombre) ?? [];

        for (const receta of recetas) {
            if (camino.has(receta.descripcion)) {
                continue;
            }

            const factorSubPlato = factor * receta.porcionBruta;

            if (!Number.isFinite(factorSubPlato) || factorSubPlato === 0) {
                continue;
            }

            coeficientes.set(
                receta.descripcion,
                (coeficientes.get(receta.descripcion) ?? 0) + factorSubPlato,
            );

            const nuevoCamino = new Set(camino);
            nuevoCamino.add(receta.descripcion);
            pila.push({
                nombre: receta.descripcion,
                factor: factorSubPlato,
                camino: nuevoCamino,
            });
        }
    }

    cache.set(platoPrincipal, coeficientes);
    return coeficientes;
}

function agruparPlatosPorNombre(
    platos: { nombre: string; cantidad: number }[],
): Map<string, number> {
    const platosAgrupados = new Map<string, number>();

    for (const plato of platos) {
        const nombre = normalizarTexto(plato.nombre);
        const cantidad = Number(plato.cantidad);

        if (!nombre || !Number.isFinite(cantidad) || cantidad === 0) {
            continue;
        }

        platosAgrupados.set(
            nombre,
            (platosAgrupados.get(nombre) ?? 0) + cantidad,
        );
    }

    return platosAgrupados;
}

function normalizarTexto(texto: string | null | undefined): string {
    return (texto ?? '').trim();
}

function redondearCantidad(valor: number): number {
    if (!Number.isFinite(valor)) {
        return 0;
    }

    return Number(valor.toFixed(4));
}
