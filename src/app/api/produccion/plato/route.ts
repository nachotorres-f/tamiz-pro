import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

interface PlatoPayload {
    platoCodigo?: string;
    cantidad?: number | string;
    fecha?: string;
    salon?: string;
}

interface Body extends PlatoPayload {
    platos?: PlatoPayload[];
}

interface PlatoNormalizado {
    platoCodigo: string;
    cantidad: number;
    fecha: string;
    salon: string;
}

const normalizarPayload = (payload: Body): PlatoPayload[] => {
    if (Array.isArray(payload.platos) && payload.platos.length > 0) {
        return payload.platos.map((plato) => ({
            ...plato,
            salon: plato.salon ?? payload.salon,
        }));
    }

    return [payload];
};

const sanitizarPlatos = (platos: PlatoPayload[]) => {
    const invalidos: Array<{ index: number; plato: PlatoPayload }> = [];
    const normalizados: PlatoNormalizado[] = [];

    platos.forEach((plato, index) => {
        const platoCodigo = String(plato.platoCodigo ?? '').trim();
        const fecha = String(plato.fecha ?? '').trim();
        const salon = String(plato.salon ?? '').trim();
        const cantidadNum = Number(plato.cantidad);
        const fechaNormalizada = new Date(fecha.split('T')[0]);

        if (
            !platoCodigo ||
            !fecha ||
            !salon ||
            !Number.isFinite(cantidadNum) ||
            cantidadNum <= 0 ||
            !Number.isFinite(fechaNormalizada.getTime())
        ) {
            invalidos.push({ index, plato });
            return;
        }

        normalizados.push({
            platoCodigo,
            cantidad: Number(cantidadNum.toFixed(2)),
            fecha,
            salon,
        });
    });

    return { invalidos, normalizados };
};

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    let body: Body | null = null;

    try {
        const payload = (await req.json()) as Body;
        body = payload;

        const platosRecibidos = normalizarPayload(payload);
        const { invalidos, normalizados } = sanitizarPlatos(platosRecibidos);

        if (normalizados.length === 0 || invalidos.length > 0) {
            await logAudit({
                modulo: 'produccion',
                accion: 'agregar_plato_produccion',
                ruta: '/api/produccion/plato',
                metodo: 'POST',
                estado: 'warning',
                resumen: 'Datos incompletos para agregar platos a producción',
                detalle: {
                    payload,
                    invalidos,
                },
            });

            return NextResponse.json(
                { error: 'Datos incompletos' },
                { status: 400 },
            );
        }

        const codigos = Array.from(
            new Set(normalizados.map((item) => item.platoCodigo)),
        );

        const recetas = await prisma.receta.findMany({
            where: { codigo: { in: codigos } },
            select: {
                codigo: true,
                nombreProducto: true,
            },
        });

        const recetasPorCodigo = new Map(
            recetas.map((receta) => [receta.codigo, receta.nombreProducto]),
        );

        const codigosFaltantes = codigos.filter(
            (codigo) => !recetasPorCodigo.has(codigo),
        );

        if (codigosFaltantes.length > 0) {
            await logAudit({
                modulo: 'produccion',
                accion: 'agregar_plato_produccion',
                ruta: '/api/produccion/plato',
                metodo: 'POST',
                estado: 'warning',
                resumen:
                    'No se encontraron recetas para uno o más códigos en producción',
                detalle: {
                    codigosFaltantes,
                    payload,
                },
            });

            return NextResponse.json(
                { error: 'No se encontró receta para el código enviado' },
                { status: 400 },
            );
        }

        const resultados: Array<{
            platoCodigo: string;
            fecha: string;
            cantidad: number;
            salon: string;
            modo: 'update' | 'create';
        }> = [];

        await prisma.$transaction(async (tx) => {
            for (const plato of normalizados) {
                const fecha = new Date(plato.fecha.split('T')[0]);
                const existente = await tx.produccion.findFirst({
                    where: {
                        platoCodigo: plato.platoCodigo,
                        platoPadreCodigo: '',
                        platoPadre: '',
                        fecha,
                        salon: plato.salon,
                    },
                    orderBy: {
                        id: 'asc',
                    },
                });

                if (existente) {
                    await tx.produccion.update({
                        where: { id: existente.id },
                        data: {
                            cantidad: existente.cantidad + plato.cantidad,
                        },
                    });

                    resultados.push({
                        platoCodigo: plato.platoCodigo,
                        fecha: plato.fecha.split('T')[0],
                        cantidad: plato.cantidad,
                        salon: plato.salon,
                        modo: 'update',
                    });
                    continue;
                }

                await tx.produccion.create({
                    data: {
                        plato: recetasPorCodigo.get(plato.platoCodigo) || '',
                        platoCodigo: plato.platoCodigo,
                        platoPadre: '',
                        platoPadreCodigo: '',
                        cantidad: plato.cantidad,
                        fecha,
                        salon: plato.salon,
                    },
                });

                resultados.push({
                    platoCodigo: plato.platoCodigo,
                    fecha: plato.fecha.split('T')[0],
                    cantidad: plato.cantidad,
                    salon: plato.salon,
                    modo: 'create',
                });
            }
        });

        await logAudit({
            modulo: 'produccion',
            accion: 'agregar_plato_produccion',
            ruta: '/api/produccion/plato',
            metodo: 'POST',
            resumen: `Se agregaron ${resultados.length} platos en producción`,
            detalle: {
                total: resultados.length,
                resultados,
            },
        });

        return NextResponse.json({ ok: true, total: resultados.length });
    } catch (error) {
        await logAudit({
            modulo: 'produccion',
            accion: 'agregar_plato_produccion',
            ruta: '/api/produccion/plato',
            metodo: 'POST',
            estado: 'error',
            resumen: 'Error agregando platos a producción',
            detalle: {
                body,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al agregar platos a producción' },
            { status: 500 },
        );
    }
}
