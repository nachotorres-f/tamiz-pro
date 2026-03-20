/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { startOfWeek, addDays, format } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

const TIMEZONE = 'America/Argentina/Buenos_Aires';
const TIPO_RECETA_PT = 'PT';
const DIAS_EVENTOS_CICLO = 6;
const DIAS_INICIO_ADELANTOS = 7;
const DIAS_PRODUCCION_EXTRA = { anterior: 5, posterior: 9 };
const PLATOS_PADRE_EXCLUIDOS = new Set(['barra de tragos el central']);
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

type Resultado = {
    plato: string;
    platoCodigo: string;
    platoPadre: string;
    platoPadreCodigo: string;
    fecha: string;
    cantidad: number;
    lugar: string;
};

interface Receta {
    codigo: string;
    nombreProducto: string;
    descripcion: string;
    subCodigo: string;
    tipo: 'PT' | 'MP';
    porcionBruta: number;
}

interface PlatoEvento {
    comandaId: number;
    plato: string;
    platoCodigo: string;
    fecha: string;
    cantidad: number;
    gestionado: boolean;
    lugar: string;
}

interface MapasRecetas {
    codigosPT: Set<string>;
    recetasPTPorCodigoPadre: Map<string, Receta[]>;
    codigoPorNombreProducto: Map<string, string>;
    codigoPorDescripcion: Map<string, string>;
    nombrePorCodigoPadre: Map<string, string>;
    nombrePorSubCodigo: Map<string, string>;
}

function normalizarTexto(valor: string | null | undefined): string {
    return (valor ?? '').trim();
}

function normalizarFechaInicioDia(valor: Date): Date {
    const fechaNormalizada = new Date(valor);
    fechaNormalizada.setHours(0, 0, 0, 0);
    return fechaNormalizada;
}

function normalizarClave(valor: string | null | undefined): string {
    return normalizarTexto(valor).toLocaleLowerCase('es');
}

function obtenerDecisionAt(produccion: {
    createdAt: Date;
    updatedAt?: Date | null;
}): Date {
    const createdAt = new Date(produccion.createdAt);
    const updatedAt = produccion?.updatedAt
        ? new Date(produccion.updatedAt)
        : null;

    if (!updatedAt || Number.isNaN(updatedAt.getTime())) {
        return createdAt;
    }

    return updatedAt.getTime() > createdAt.getTime() ? updatedAt : createdAt;
}

function crearMapasRecetas(recetas: Receta[]): MapasRecetas {
    const codigosPT = new Set<string>();
    const recetasPTPorCodigoPadre = new Map<string, Receta[]>();
    const codigoPorNombreProducto = new Map<string, string>();
    const codigoPorDescripcion = new Map<string, string>();
    const nombrePorCodigoPadre = new Map<string, string>();
    const nombrePorSubCodigo = new Map<string, string>();

    for (const receta of recetas) {
        const codigoPadre = normalizarTexto(receta.codigo);
        const subCodigo = normalizarTexto(receta.subCodigo);
        const nombreProducto = normalizarTexto(receta.nombreProducto);
        const descripcion = normalizarTexto(receta.descripcion);

        if (codigoPadre) {
            nombrePorCodigoPadre.set(codigoPadre, nombreProducto || codigoPadre);
        }

        if (subCodigo) {
            nombrePorSubCodigo.set(subCodigo, descripcion || subCodigo);
        }

        const claveNombreProducto = normalizarClave(nombreProducto);
        if (claveNombreProducto && codigoPadre && !codigoPorNombreProducto.has(claveNombreProducto)) {
            codigoPorNombreProducto.set(claveNombreProducto, codigoPadre);
        }

        const claveDescripcion = normalizarClave(descripcion);
        if (claveDescripcion && subCodigo && !codigoPorDescripcion.has(claveDescripcion)) {
            codigoPorDescripcion.set(claveDescripcion, subCodigo);
        }

        if (receta.tipo !== TIPO_RECETA_PT || !codigoPadre || !subCodigo) {
            continue;
        }

        codigosPT.add(codigoPadre);

        if (!recetasPTPorCodigoPadre.has(codigoPadre)) {
            recetasPTPorCodigoPadre.set(codigoPadre, []);
        }

        recetasPTPorCodigoPadre.get(codigoPadre)!.push(receta);
    }

    return {
        codigosPT,
        recetasPTPorCodigoPadre,
        codigoPorNombreProducto,
        codigoPorDescripcion,
        nombrePorCodigoPadre,
        nombrePorSubCodigo,
    };
}

function resolverNombrePlato(codigo: string, mapas: MapasRecetas, fallback: string): string {
    const codigoNormalizado = normalizarTexto(codigo);
    if (!codigoNormalizado) {
        return normalizarTexto(fallback);
    }

    return (
        mapas.nombrePorSubCodigo.get(codigoNormalizado) ||
        mapas.nombrePorCodigoPadre.get(codigoNormalizado) ||
        normalizarTexto(fallback) ||
        codigoNormalizado
    );
}

function resolverNombrePlatoPadre(
    codigoPadre: string,
    mapas: MapasRecetas,
    fallback: string,
): string {
    const codigoNormalizado = normalizarTexto(codigoPadre);
    if (!codigoNormalizado) {
        return normalizarTexto(fallback);
    }

    return (
        mapas.nombrePorCodigoPadre.get(codigoNormalizado) ||
        normalizarTexto(fallback) ||
        codigoNormalizado
    );
}

function resolverCodigoPlato(item: any, mapas: MapasRecetas): string {
    const codigoDirecto = normalizarTexto(item?.platoCodigo);
    if (codigoDirecto) {
        return codigoDirecto;
    }

    const porDescripcion = mapas.codigoPorDescripcion.get(normalizarClave(item?.plato));
    if (porDescripcion) {
        return porDescripcion;
    }

    return mapas.codigoPorNombreProducto.get(normalizarClave(item?.plato)) || '';
}

function resolverCodigoPlatoPadre(item: any, mapas: MapasRecetas): string {
    const codigoDirecto = normalizarTexto(item?.platoPadreCodigo);
    if (codigoDirecto) {
        return codigoDirecto;
    }

    return mapas.codigoPorNombreProducto.get(normalizarClave(item?.platoPadre)) || '';
}

function construirClaveObservacion(platoCodigo: string, platoPadreCodigo: string): string {
    return `${platoCodigo}|||${platoPadreCodigo}`;
}

function obtenerObservacionPorCodigos(
    observaciones: any[],
    mapas: MapasRecetas,
): Map<string, string> {
    const map = new Map<string, string>();

    for (const observacion of observaciones) {
        const platoCodigo = resolverCodigoPlato(observacion, mapas);
        const platoPadreCodigo = resolverCodigoPlatoPadre(observacion, mapas);

        if (!platoCodigo) {
            continue;
        }

        map.set(
            construirClaveObservacion(platoCodigo, platoPadreCodigo),
            normalizarTexto(observacion?.observacion),
        );
    }

    return map;
}

export async function GET(req: NextRequest) {
    process.env.TZ = TIMEZONE;

    try {
        const { searchParams } = req.nextUrl;
        const fechaInicio = searchParams.get('fechaInicio');
        const salon = searchParams.get('salon') || 'A';

        if (!fechaInicio) {
            return NextResponse.json(
                { error: 'fechaInicio es requerido' },
                { status: 400 },
            );
        }

        if (!['A', 'B'].includes(salon)) {
            return NextResponse.json(
                { error: 'salon debe ser "A" o "B"' },
                { status: 400 },
            );
        }

        const inicio = calcularRangoSemana(fechaInicio);
        const recetas = await obtenerRecetas();
        const mapasRecetas = crearMapasRecetas(recetas);

        const eventos = await obtenerEventosSemana(
            inicio,
            Array.from(mapasRecetas.codigosPT),
            salon,
        );

        const platos = procesarEventosAPlatos(eventos, mapasRecetas);

        const [ingredientes, produccion] = await Promise.all([
            calcularIngredientesConFormato(platos, mapasRecetas),
            obtenerProduccion(inicio, salon, mapasRecetas),
        ]);

        await logAudit({
            modulo: 'planificacion',
            accion: 'consultar_planificacion',
            ruta: '/api/planificacion',
            metodo: 'GET',
            resumen: `Planificación consultada para salón ${salon}`,
            detalle: {
                fechaInicio,
                salon,
                ingredientes: ingredientes.length,
                produccion: produccion.length,
                eventos: eventos.length,
            },
        });

        return NextResponse.json({
            planifacion: ingredientes,
            produccion,
        });
    } catch (error) {
        await logAudit({
            modulo: 'planificacion',
            accion: 'consultar_planificacion',
            ruta: '/api/planificacion',
            metodo: 'GET',
            estado: 'error',
            resumen: 'Error consultando planificación',
            detalle: {
                error: error instanceof Error ? error.message : String(error),
            },
        });

        const mensaje =
            error instanceof Error
                ? error.message
                : 'Error interno del servidor';
        const status = mensaje === 'fechaInicio es requerido' ? 400 : 500;

        return NextResponse.json({ error: mensaje }, { status });
    }
}

export async function POST(req: NextRequest) {
    process.env.TZ = TIMEZONE;

    const { salon, produccion, observaciones, fechaInicio } = await req.json();

    if (!Array.isArray(produccion)) {
        return NextResponse.json(
            { error: 'El cuerpo debe ser un array de producciones' },
            { status: 400 },
        );
    }

    if (!Array.isArray(observaciones)) {
        return NextResponse.json(
            { error: 'El cuerpo debe ser un array de observaciones' },
            { status: 400 },
        );
    }

    if (!salon) {
        return NextResponse.json(
            { error: 'El salón es requerido' },
            { status: 400 },
        );
    }

    if (!fechaInicio) {
        return NextResponse.json(
            { error: 'La fecha es requerido' },
            { status: 400 },
        );
    }

    try {
        const recetas = await obtenerRecetas();
        const mapasRecetas = crearMapasRecetas(recetas);
        const observacionPorCodigos = obtenerObservacionPorCodigos(
            observaciones,
            mapasRecetas,
        );

        if (produccion.length === 0 && observaciones.length > 0) {
            for (const observacionProduccion of observaciones) {
                const platoCodigo = resolverCodigoPlato(observacionProduccion, mapasRecetas);
                const platoPadreCodigo = resolverCodigoPlatoPadre(
                    observacionProduccion,
                    mapasRecetas,
                );

                if (!platoCodigo) {
                    continue;
                }

                await prisma.produccion.updateMany({
                    where: {
                        platoCodigo,
                        platoPadreCodigo,
                        salon,
                        fecha: {
                            gte: new Date(fechaInicio),
                            lte: addDays(new Date(fechaInicio), 11),
                        },
                    },
                    data: {
                        observacion: normalizarTexto(observacionProduccion.observacion),
                        plato: resolverNombrePlato(
                            platoCodigo,
                            mapasRecetas,
                            observacionProduccion?.plato,
                        ),
                        platoPadre: resolverNombrePlatoPadre(
                            platoPadreCodigo,
                            mapasRecetas,
                            observacionProduccion?.platoPadre,
                        ),
                    },
                });
            }
        }

        for (const item of produccion) {
            const eliminar =
                item?.eliminar === true ||
                item?.cantidad === null ||
            item?.cantidad === '';
        const cantidad = Number(item?.cantidad);
        const platoCodigo = resolverCodigoPlato(item, mapasRecetas);
        const platoPadreCodigo = resolverCodigoPlatoPadre(item, mapasRecetas);

            if (!platoCodigo || !item.fecha || (!eliminar && !Number.isFinite(cantidad))) {
                return NextResponse.json(
                    {
                        error: 'Cada item debe tener platoCodigo, fecha y cantidad',
                    },
                    { status: 400 },
                );
            }

            const platoNombre = resolverNombrePlato(platoCodigo, mapasRecetas, item?.plato);
            const platoPadreNombre = resolverNombrePlatoPadre(
                platoPadreCodigo,
                mapasRecetas,
                item?.platoPadre,
            );

        const observacion =
            observacionPorCodigos.get(
                construirClaveObservacion(platoCodigo, platoPadreCodigo),
            ) || '';

            if (eliminar) {
                await prisma.produccion.deleteMany({
                    where: {
                        platoCodigo,
                        platoPadreCodigo,
                        fecha: new Date(item.fecha),
                        salon,
                    },
                });
                continue;
            }

        const existe = await prisma.produccion.findFirst({
            where: {
                platoCodigo,
                platoPadreCodigo,
                fecha: new Date(item.fecha),
                salon,
            },
        });

            if (existe) {
                if (
                    existe.cantidad === cantidad &&
                    existe.observacion === observacion &&
                    existe.plato === platoNombre &&
                    existe.platoPadre === platoPadreNombre
                ) {
                    continue;
                }

                await prisma.produccion.update({
                    where: { id: existe.id },
                    data: {
                        cantidad,
                        salon,
                        observacion,
                        plato: platoNombre,
                        platoPadre: platoPadreNombre,
                        platoCodigo,
                        platoPadreCodigo,
                    },
                });
                continue;
            }

            await prisma.produccion.create({
                data: {
                    plato: platoNombre,
                    platoCodigo,
                    platoPadre: platoPadreNombre,
                    platoPadreCodigo,
                    fecha: new Date(item.fecha),
                    cantidad,
                    salon,
                    observacion,
                },
            });
        }

        await logAudit({
            modulo: 'planificacion',
            accion: 'guardar_planificacion',
            ruta: '/api/planificacion',
            metodo: 'POST',
            resumen: `Planificación guardada para salón ${salon}`,
            detalle: {
                fechaInicio,
                salon,
                cambiosProduccion: produccion.length,
                observaciones: observaciones.length,
            },
        });

        return NextResponse.json({ message: 'Producción actualizada' });
    } catch (error) {
        await logAudit({
            modulo: 'planificacion',
            accion: 'guardar_planificacion',
            ruta: '/api/planificacion',
            metodo: 'POST',
            estado: 'error',
            resumen: 'Error guardando planificación',
            detalle: {
                fechaInicio,
                salon,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 },
        );
    }
}

async function calcularIngredientesPT(
    platos: PlatoEvento[],
    mapasRecetas: MapasRecetas,
): Promise<Resultado[]> {
    const resultado: Resultado[] = [];
    const visitados = new Set<string>();

    async function recorrer(
        codigoPadre: string,
        fecha: string,
        cantidad: number,
        lugar: string,
        comandaId: number,
        platoPrincipal: string,
    ) {
        const subRecetas = mapasRecetas.recetasPTPorCodigoPadre.get(codigoPadre) || [];

        for (const receta of subRecetas) {
            const ingrediente = normalizarTexto(receta.descripcion);
            const ingredienteCodigo = normalizarTexto(receta.subCodigo);
            const platoPadre = normalizarTexto(receta.nombreProducto);
            const platoPadreCodigo = normalizarTexto(receta.codigo);
            const porcion = receta.porcionBruta || 1;
            const cantidadTotal = cantidad * porcion;
            const cantidadRedondeada = parseFloat(cantidadTotal.toFixed(2));

            if (!ingredienteCodigo || !platoPadreCodigo) {
                continue;
            }

            if (
                !debeExcluirSubPlato(platoPrincipal, ingrediente) &&
                !debeExcluirPlatoPadre(platoPadre)
            ) {
                resultado.push({
                    plato: ingrediente,
                    platoCodigo: ingredienteCodigo,
                    platoPadre,
                    platoPadreCodigo,
                    fecha,
                    cantidad: cantidadRedondeada,
                    lugar,
                });
            }

            const claveVisitado = `${ingredienteCodigo}|||${platoPadreCodigo}|||${comandaId}`;
            if (!visitados.has(claveVisitado)) {
                visitados.add(claveVisitado);
                await recorrer(
                    ingredienteCodigo,
                    fecha,
                    cantidadRedondeada,
                    lugar,
                    comandaId,
                    platoPrincipal,
                );
            }
        }
    }

    for (const item of platos) {
        await recorrer(
            item.platoCodigo,
            item.fecha,
            item.cantidad,
            item.lugar,
            item.comandaId,
            item.plato,
        );
    }

    const agrupado = new Map<string, Resultado>();

    for (const item of resultado) {
        const key = `${item.platoCodigo}_${item.platoPadreCodigo}_${item.fecha}`;
        if (!agrupado.has(key)) {
            agrupado.set(key, { ...item });
        } else {
            agrupado.get(key)!.cantidad += item.cantidad;
        }
    }

    return Array.from(agrupado.values());
}

function validarFechaInicio(fechaInicio: string | null): Date {
    if (!fechaInicio) {
        throw new Error('fechaInicio es requerido');
    }
    return new Date(fechaInicio);
}

function calcularRangoSemana(fechaInicio: string): Date {
    const fechaBase = validarFechaInicio(fechaInicio);
    return startOfWeek(fechaBase, { weekStartsOn: 1 });
}

async function obtenerEventosSemana(
    inicio: Date,
    codigosPT: string[],
    salon: string,
) {
    const lugares = ['El Central', 'La Rural'];
    const usarNotIn = salon === 'A';
    const fechaFinCiclo = addDays(inicio, DIAS_EVENTOS_CICLO);
    const fechaInicioAdelantos = addDays(inicio, DIAS_INICIO_ADELANTOS);

    return prisma.comanda.findMany({
        where: {
            deshabilitadaPlanificacion: false,
            OR: [
                {
                    fecha: {
                        gte: inicio,
                        lte: fechaFinCiclo,
                    },
                    lugar: usarNotIn ? { notIn: lugares } : { in: lugares },
                    Plato: {
                        some: {
                            codigo: { in: codigosPT },
                        },
                    },
                },
                {
                    fecha: {
                        gte: fechaInicioAdelantos,
                    },
                    lugar: usarNotIn ? { notIn: lugares } : { in: lugares },
                    Plato: {
                        some: {
                            codigo: { in: codigosPT },
                            fecha: {
                                not: null,
                            },
                        },
                    },
                },
                {
                    id: 1,
                },
            ],
        },
        include: {
            Plato: {
                where: {
                    codigo: { in: codigosPT },
                    OR: [
                        {
                            comanda: {
                                fecha: {
                                    gte: inicio,
                                    lte: fechaFinCiclo,
                                },
                            },
                        },
                        {
                            fecha: {
                                not: null,
                            },
                            comanda: {
                                fecha: {
                                    gte: fechaInicioAdelantos,
                                },
                            },
                        },
                    ],
                },
            },
        },
    });
}

function procesarEventosAPlatos(
    eventos: any[],
    mapasRecetas: MapasRecetas,
): PlatoEvento[] {
    const resultado: PlatoEvento[] = [];

    for (const evento of eventos) {
        for (const plato of evento.Plato) {
            const platoCodigo = normalizarTexto(plato.codigo);

            if (!platoCodigo || !mapasRecetas.codigosPT.has(platoCodigo)) {
                continue;
            }

            resultado.push({
                comandaId: evento.id,
                plato: resolverNombrePlato(platoCodigo, mapasRecetas, plato.nombre),
                platoCodigo,
                fecha: plato.fecha
                    ? format(addDays(plato.fecha, 1), 'yyyy-MM-dd')
                    : format(addDays(evento.fecha, 1), 'yyyy-MM-dd'),
                cantidad: plato.cantidad,
                gestionado: plato.gestionado || false,
                lugar: evento.lugar,
            });
        }
    }

    return resultado.sort((a, b) => a.plato.localeCompare(b.plato));
}

async function obtenerRecetas(): Promise<Receta[]> {
    const recetasRaw = await prisma.receta.findMany({});

    return recetasRaw.map((receta) => ({
        codigo: normalizarTexto(receta.codigo),
        nombreProducto: normalizarTexto(receta.nombreProducto),
        descripcion: normalizarTexto(receta.descripcion),
        subCodigo: normalizarTexto(receta.subCodigo),
        tipo: receta.tipo as 'PT' | 'MP',
        porcionBruta: receta.porcionBruta,
    }));
}

async function calcularIngredientesConFormato(
    platos: PlatoEvento[],
    mapasRecetas: MapasRecetas,
) {
    const ingredientes = await calcularIngredientesPT(platos, mapasRecetas);

    return ingredientes.map((ingrediente) => ({
        ...ingrediente,
        cantidad: parseFloat(ingrediente.cantidad.toFixed(2)),
    }));
}

async function obtenerProduccion(
    inicio: Date,
    salon: string,
    mapasRecetas: MapasRecetas,
) {
    const inicioCiclo = normalizarFechaInicioDia(inicio);
    const produccion = await prisma.produccion.findMany({
        where: {
            fecha: {
                gte: addDays(inicio, -DIAS_PRODUCCION_EXTRA.anterior),
                lte: addDays(inicio, DIAS_PRODUCCION_EXTRA.posterior),
            },
            salon,
        },
    });

    return produccion.map((prod) => ({
        ...prod,
        plato: resolverNombrePlato(prod.platoCodigo, mapasRecetas, prod.plato),
        platoPadre: resolverNombrePlatoPadre(
            prod.platoPadreCodigo,
            mapasRecetas,
            prod.platoPadre,
        ),
        cantidad: parseFloat(prod.cantidad.toFixed(2)),
        esAnteriorACiclo:
            obtenerDecisionAt(prod).getTime() < inicioCiclo.getTime(),
    }));
}

function normalizarClaveFiltro(texto: string): string {
    return (texto ?? '').trim().toLocaleLowerCase('es');
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

function debeExcluirPlatoPadre(platoPadre: string): boolean {
    return PLATOS_PADRE_EXCLUIDOS.has(normalizarClaveFiltro(platoPadre));
}
