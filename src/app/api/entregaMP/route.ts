import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { format, startOfWeek, addDays } from 'date-fns';
import { logAudit } from '@/lib/audit';

type Plato = {
    plato: string;
    platoCodigo: string;
    fecha: string;
    cantidad: number;
};

type Receta = {
    codigo: string;
    nombreProducto: string;
    descripcion: string;
    subCodigo: string;
    tipo: 'PT' | 'MP';
    porcionBruta: number;
};

type Resultado = {
    plato: string;
    platoCodigo: string;
    fecha: string;
    cantidad: number;
};

function normalizarTexto(valor: string | null | undefined): string {
    return (valor ?? '').trim();
}

function normalizarClave(valor: string | null | undefined): string {
    return normalizarTexto(valor).toLocaleLowerCase('es');
}

function crearMapasRecetas(recetas: Receta[]) {
    const recetasPTPorCodigoPadre = new Map<string, Receta[]>();
    const codigoPorNombre = new Map<string, string>();
    const nombrePorCodigo = new Map<string, string>();

    for (const receta of recetas) {
        const codigo = normalizarTexto(receta.codigo);
        const nombreProducto = normalizarTexto(receta.nombreProducto);
        const subCodigo = normalizarTexto(receta.subCodigo);
        const descripcion = normalizarTexto(receta.descripcion);

        if (codigo && !nombrePorCodigo.has(codigo)) {
            nombrePorCodigo.set(codigo, nombreProducto || codigo);
        }

        if (subCodigo && !nombrePorCodigo.has(subCodigo)) {
            nombrePorCodigo.set(subCodigo, descripcion || subCodigo);
        }

        const claveNombre = normalizarClave(nombreProducto);
        if (claveNombre && codigo && !codigoPorNombre.has(claveNombre)) {
            codigoPorNombre.set(claveNombre, codigo);
        }

        if (receta.tipo !== 'PT' || !codigo || !subCodigo) {
            continue;
        }

        if (!recetasPTPorCodigoPadre.has(codigo)) {
            recetasPTPorCodigoPadre.set(codigo, []);
        }

        recetasPTPorCodigoPadre.get(codigo)!.push(receta);
    }

    return {
        recetasPTPorCodigoPadre,
        codigoPorNombre,
        nombrePorCodigo,
    };
}

async function calcularIngredientesPT(
    platos: Plato[],
    recetas: Receta[],
): Promise<Resultado[]> {
    const resultado: Resultado[] = [];
    const visitados = new Set<string>();
    const mapasRecetas = crearMapasRecetas(recetas);

    async function recorrer(codigo: string, fecha: string, cantidad: number) {
        const subRecetas = mapasRecetas.recetasPTPorCodigoPadre.get(codigo) || [];

        for (const receta of subRecetas) {
            const ingredienteCodigo = normalizarTexto(receta.subCodigo);
            const ingrediente = normalizarTexto(receta.descripcion);
            const porcion = receta.porcionBruta || 1;
            const cantidadTotal = cantidad * porcion;

            if (!ingredienteCodigo) {
                continue;
            }

            resultado.push({
                plato: ingrediente,
                platoCodigo: ingredienteCodigo,
                fecha,
                cantidad: cantidadTotal,
            });

            const claveVisitado = `${codigo}|||${ingredienteCodigo}`;
            if (!visitados.has(claveVisitado)) {
                visitados.add(claveVisitado);
                await recorrer(ingredienteCodigo, fecha, cantidadTotal);
            }
        }
    }

    for (const item of platos) {
        await recorrer(item.platoCodigo, item.fecha, item.cantidad);
    }

    const agrupado = new Map<string, Resultado>();

    for (const item of resultado) {
        const key = `${item.platoCodigo}_${item.fecha}`;
        if (!agrupado.has(key)) {
            agrupado.set(key, { ...item });
        } else {
            agrupado.get(key)!.cantidad += item.cantidad;
        }
    }

    return Array.from(agrupado.values());
}

export async function GET() {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    try {
        const fechaBase = new Date();
        const inicio = startOfWeek(fechaBase, { weekStartsOn: 0 });

        const [eventos, recetasRaw] = await Promise.all([
            prisma.comanda.findMany({
                where: {
                    fecha: {
                        gte: inicio,
                    },
                },
                include: {
                    Plato: true,
                },
            }),
            prisma.receta.findMany({}),
        ]);

        const recetas: Receta[] = recetasRaw.map((r) => ({
            codigo: normalizarTexto(r.codigo),
            nombreProducto: normalizarTexto(r.nombreProducto),
            descripcion: normalizarTexto(r.descripcion),
            subCodigo: normalizarTexto(r.subCodigo),
            tipo: r.tipo as 'PT' | 'MP',
            porcionBruta: r.porcionBruta,
        }));

        const { nombrePorCodigo } = crearMapasRecetas(recetas);

        const resultado: Plato[] = [];

        for (const evento of eventos) {
            for (const plato of evento.Plato) {
                const platoCodigo = normalizarTexto(plato.codigo);
                if (!platoCodigo) {
                    continue;
                }

                resultado.push({
                    plato:
                        nombrePorCodigo.get(platoCodigo) ||
                        normalizarTexto(plato.nombre),
                    platoCodigo,
                    fecha: format(addDays(evento.fecha, 1), 'yyyy-MM-dd'),
                    cantidad: plato.cantidad,
                });
            }
        }

        resultado.sort((a, b) => a.plato.localeCompare(b.plato));

        const ingredientes = await calcularIngredientesPT(resultado, recetas);

        await logAudit({
            modulo: 'entrega_mp',
            accion: 'consultar_entrega_mp',
            ruta: '/api/entregaMP',
            metodo: 'GET',
            resumen: 'Consulta de entrega MP',
            detalle: {
                eventos: eventos.length,
                ingredientes: ingredientes.length,
            },
        });

        return NextResponse.json(ingredientes);
    } catch (error) {
        await logAudit({
            modulo: 'entrega_mp',
            accion: 'consultar_entrega_mp',
            ruta: '/api/entregaMP',
            metodo: 'GET',
            estado: 'error',
            resumen: 'Error consultando entrega MP',
            detalle: {
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al consultar entrega MP' },
            { status: 500 },
        );
    }
}

interface BODY {
    ingrediente: string;
    ingredienteCodigo?: string;
    produccion: { fecha: string; cantidad: number }[];
}

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    let body: BODY | null = null;
    let ingredienteCodigo = '';

    try {
        const payload = (await req.json()) as BODY;
        body = payload;
        const recetasRaw = await prisma.receta.findMany({});
        const recetas: Receta[] = recetasRaw.map((r) => ({
            codigo: normalizarTexto(r.codigo),
            nombreProducto: normalizarTexto(r.nombreProducto),
            descripcion: normalizarTexto(r.descripcion),
            subCodigo: normalizarTexto(r.subCodigo),
            tipo: r.tipo as 'PT' | 'MP',
            porcionBruta: r.porcionBruta,
        }));
        const { codigoPorNombre, nombrePorCodigo } = crearMapasRecetas(recetas);

        ingredienteCodigo =
            normalizarTexto(payload.ingredienteCodigo) ||
            codigoPorNombre.get(normalizarClave(payload.ingrediente)) ||
            '';

        if (!ingredienteCodigo) {
            await logAudit({
                modulo: 'entrega_mp',
                accion: 'guardar_entrega_mp',
                ruta: '/api/entregaMP',
                metodo: 'POST',
                estado: 'warning',
                resumen: 'No se pudo resolver código de ingrediente',
                detalle: {
                    ingrediente: payload.ingrediente,
                },
            });

            return NextResponse.json(
                {
                    success: false,
                    message: 'No se pudo resolver el código del ingrediente',
                },
                { status: 400 },
            );
        }

        const ingredienteNombre =
            nombrePorCodigo.get(ingredienteCodigo) ||
            normalizarTexto(payload.ingrediente);

        for (const { fecha, cantidad } of payload.produccion) {
            const fechaSinHora = new Date(fecha);
            fechaSinHora.setHours(0, 0, 0, 0);

            const existente = await prisma.produccion.findFirst({
                where: {
                    platoCodigo: ingredienteCodigo,
                    platoPadreCodigo: '',
                    fecha: fechaSinHora,
                },
            });

            if (existente) {
                await prisma.produccion.update({
                    where: { id: existente.id },
                    data: {
                        cantidad,
                        plato: ingredienteNombre,
                        platoCodigo: ingredienteCodigo,
                        platoPadre: '',
                        platoPadreCodigo: '',
                    },
                });
            } else {
                if (cantidad === 0) {
                    continue;
                }

                await prisma.produccion.create({
                    data: {
                        plato: ingredienteNombre,
                        platoCodigo: ingredienteCodigo,
                        platoPadre: '',
                        platoPadreCodigo: '',
                        fecha: fechaSinHora,
                        cantidad,
                    },
                });
            }
        }

        await logAudit({
            modulo: 'entrega_mp',
            accion: 'guardar_entrega_mp',
            ruta: '/api/entregaMP',
            metodo: 'POST',
            resumen: `Entrega MP guardada para ${ingredienteCodigo}`,
            detalle: {
                ingrediente: payload.ingrediente,
                ingredienteCodigo,
                cambios: payload.produccion.length,
            },
        });

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        await logAudit({
            modulo: 'entrega_mp',
            accion: 'guardar_entrega_mp',
            ruta: '/api/entregaMP',
            metodo: 'POST',
            estado: 'error',
            resumen: 'Error guardando entrega MP',
            detalle: {
                ingrediente: body?.ingrediente || null,
                ingredienteCodigo: ingredienteCodigo || null,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al guardar entrega MP' },
            { status: 500 },
        );
    }
}
