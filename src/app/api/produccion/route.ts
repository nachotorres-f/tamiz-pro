/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';
import { logAudit } from '@/lib/audit';

function normalizarTexto(valor: string | null | undefined): string {
    return (valor ?? '').trim();
}

function normalizarClave(valor: string | null | undefined): string {
    return normalizarTexto(valor).toLocaleLowerCase('es');
}

function normalizarFechaInicioDia(valor: Date): Date {
    const fechaNormalizada = new Date(valor);
    fechaNormalizada.setHours(0, 0, 0, 0);
    return fechaNormalizada;
}

async function obtenerMapasRecetas() {
    const recetas = await prisma.receta.findMany({
        select: {
            id: true,
            codigo: true,
            subCodigo: true,
            nombreProducto: true,
            descripcion: true,
        },
        orderBy: {
            id: 'asc',
        },
    });

    const codigoPorNombreProducto = new Map<string, string>();
    const nombrePorCodigoPadre = new Map<string, string>();
    const nombrePorSubCodigo = new Map<string, string>();

    for (const receta of recetas) {
        const codigoPadre = normalizarTexto(receta.codigo);
        const subCodigo = normalizarTexto(receta.subCodigo);
        const nombreProducto = normalizarTexto(receta.nombreProducto);
        const descripcion = normalizarTexto(receta.descripcion);

        if (codigoPadre && !nombrePorCodigoPadre.has(codigoPadre)) {
            nombrePorCodigoPadre.set(codigoPadre, nombreProducto || codigoPadre);
        }

        if (subCodigo && !nombrePorSubCodigo.has(subCodigo)) {
            nombrePorSubCodigo.set(subCodigo, descripcion || subCodigo);
        }

        const claveNombre = normalizarClave(nombreProducto);
        if (claveNombre && codigoPadre && !codigoPorNombreProducto.has(claveNombre)) {
            codigoPorNombreProducto.set(claveNombre, codigoPadre);
        }
    }

    return {
        codigoPorNombreProducto,
        nombrePorCodigoPadre,
        nombrePorSubCodigo,
    };
}

function resolverNombrePlato(
    platoCodigo: string,
    nombreActual: string,
    nombrePorSubCodigo: Map<string, string>,
    nombrePorCodigoPadre: Map<string, string>,
): string {
    const codigo = normalizarTexto(platoCodigo);
    if (!codigo) {
        return normalizarTexto(nombreActual);
    }

    return (
        nombrePorSubCodigo.get(codigo) ||
        nombrePorCodigoPadre.get(codigo) ||
        normalizarTexto(nombreActual) ||
        codigo
    );
}

function resolverNombrePadre(
    platoPadreCodigo: string,
    nombreActual: string,
    nombrePorCodigoPadre: Map<string, string>,
): string {
    const codigo = normalizarTexto(platoPadreCodigo);
    if (!codigo) {
        return normalizarTexto(nombreActual);
    }

    return (
        nombrePorCodigoPadre.get(codigo) || normalizarTexto(nombreActual) || codigo
    );
}

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    let platoCodigo = '';

    try {
        const body = await req.json();
        const { platoCodigo: platoCodigoBody, plato, produccion } = body;

        if ((!platoCodigoBody && !plato) || !produccion) {
            return NextResponse.json(
                { error: 'Datos incompletos' },
                { status: 400 },
            );
        }

        const { codigoPorNombreProducto, nombrePorCodigoPadre, nombrePorSubCodigo } =
            await obtenerMapasRecetas();

        platoCodigo =
            normalizarTexto(platoCodigoBody) ||
            codigoPorNombreProducto.get(normalizarClave(plato)) ||
            '';

        if (!platoCodigo) {
            return NextResponse.json(
                { error: 'No se pudo resolver el código del plato' },
                { status: 400 },
            );
        }

        const platoNombre = resolverNombrePlato(
            platoCodigo,
            plato,
            nombrePorSubCodigo,
            nombrePorCodigoPadre,
        );

        const fechas = Object.keys(produccion);

        await Promise.all(
            fechas.map(async (fecha) => {
                const existingProduccion = await prisma.produccion.findFirst({
                    where: {
                        platoCodigo,
                        platoPadreCodigo: '',
                        fecha: new Date(fecha),
                    },
                });

                if (existingProduccion) {
                    await prisma.produccion.update({
                        where: { id: existingProduccion.id },
                        data: {
                            cantidad: produccion[fecha],
                            plato: platoNombre,
                            platoCodigo,
                        },
                    });
                    await updateGestionadoPlato(platoCodigo);
                    return { ...existingProduccion, cantidad: produccion[fecha] };
                }

                const newProduccion = await prisma.produccion.create({
                    data: {
                        plato: platoNombre,
                        platoCodigo,
                        platoPadre: '',
                        platoPadreCodigo: '',
                        fecha: new Date(fecha),
                        cantidad: produccion[fecha],
                    },
                });
                await updateGestionadoPlato(platoCodigo);
                return newProduccion;
            }),
        );

        await prisma.$executeRawUnsafe(`
            DELETE p1
            FROM Produccion p1
            JOIN Produccion p2
            ON p1.fecha = p2.fecha
            AND p1.platoCodigo = p2.platoCodigo
            AND p1.platoPadreCodigo = p2.platoPadreCodigo
            AND p1.createdAt < p2.createdAt;
        `);

        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const produccionSelect = await prisma.produccion.findMany({
            where: {
                platoCodigo,
                platoPadreCodigo: '',
                fecha: {
                    gte: addDays(startOfWeek, -1),
                },
            },
            orderBy: {
                fecha: 'asc',
            },
        });

        const data = produccionSelect.map((prod: any) => ({
            fecha: addDays(prod.fecha, 1),
            cantidad: prod.cantidad,
        }));

        await logAudit({
            modulo: 'produccion',
            accion: 'guardar_produccion_item',
            ruta: '/api/produccion',
            metodo: 'POST',
            resumen: `Producción guardada para código ${platoCodigo}`,
            detalle: {
                platoCodigo,
                cambios: Object.keys(produccion).length,
            },
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        await logAudit({
            modulo: 'produccion',
            accion: 'guardar_produccion_item',
            ruta: '/api/produccion',
            metodo: 'POST',
            estado: 'error',
            resumen: 'Error guardando producción',
            detalle: {
                platoCodigo: platoCodigo || null,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al guardar producción' },
            { status: 500 },
        );
    }
}

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    try {
        const { searchParams } = req.nextUrl;
        const fechaInicio = searchParams.get('fechaInicio');
        const previa = searchParams.get('previa');
        const salon = searchParams.get('salon');
        const hastaUltimo = searchParams.get('hastaUltimo') === 'true';

        if (!fechaInicio) {
            return NextResponse.json(
                { error: 'fechaInicio es requerido' },
                { status: 400 },
            );
        }

        const desde = addDays(new Date(fechaInicio), previa ? 1 : -1);
        desde.setHours(0, 0, 0, 0);
        const hasta = addDays(desde, 7);
        hasta.setHours(23, 59, 59, 999);

        if (hastaUltimo) {
            const ultimaProduccion = await prisma.produccion.findFirst({
                where: {
                    fecha: {
                        gte: desde,
                    },
                    cantidad: {
                        gt: 0,
                    },
                    salon,
                },
                select: {
                    fecha: true,
                },
                orderBy: {
                    fecha: 'desc',
                },
            });

            if (ultimaProduccion?.fecha) {
                const ultimaFecha = normalizarFechaInicioDia(
                    ultimaProduccion.fecha,
                );
                const ultimaFechaFinDia = new Date(ultimaFecha);
                ultimaFechaFinDia.setHours(23, 59, 59, 999);

                if (ultimaFechaFinDia.getTime() > hasta.getTime()) {
                    hasta.setTime(ultimaFechaFinDia.getTime());
                }
            }
        }

        const { nombrePorCodigoPadre, nombrePorSubCodigo } = await obtenerMapasRecetas();

        const producciones = await prisma.produccion.findMany({
            where: {
                fecha: {
                    gte: desde,
                    lte: hasta,
                },
                cantidad: {
                    gt: 0,
                },
                salon,
            },
            orderBy: {
                platoCodigo: 'asc',
            },
        });

        const groupedProducciones: any[] = [];

        for (const produccion of producciones) {
            const platoCodigo = normalizarTexto(produccion.platoCodigo);
            const platoPadreCodigo = normalizarTexto(produccion.platoPadreCodigo);
            const platoNombre = resolverNombrePlato(
                platoCodigo,
                produccion.plato,
                nombrePorSubCodigo,
                nombrePorCodigoPadre,
            );
            const platoPadreNombre = resolverNombrePadre(
                platoPadreCodigo,
                produccion.platoPadre,
                nombrePorCodigoPadre,
            );

            const existingPlato = groupedProducciones.find(
                (item: any) =>
                    (item.platoCodigo || item.plato) ===
                        (platoCodigo || platoNombre) &&
                    (item.platoPadreCodigo || item.platoPadre) ===
                        (platoPadreCodigo || platoPadreNombre),
            );

            if (existingPlato) {
                if (produccion.observacionProduccion) {
                    existingPlato.comentario =
                        existingPlato.comentario +
                        produccion.observacionProduccion +
                        '\n';
                }

                existingPlato.produccion.push({
                    fecha: addDays(produccion.fecha, previa ? -1 : 1),
                    cantidad: produccion.cantidad,
                    comentario:
                        existingPlato.comentario +
                        (produccion.observacionProduccion || '') +
                        '\n',
                });
            } else {
                groupedProducciones.push({
                    plato: platoNombre,
                    platoCodigo,
                    platoPadre: platoPadreNombre,
                    platoPadreCodigo,
                    comentario: (produccion.observacionProduccion || '') + '\n',
                    produccion: [
                        {
                            fecha: addDays(produccion.fecha, previa ? -1 : 1),
                            cantidad: produccion.cantidad,
                            comentario:
                                (produccion.observacionProduccion || '') + '\n',
                        },
                    ],
                    salon: produccion.salon,
                });
            }
        }

        await logAudit({
            modulo: 'produccion',
            accion: 'consultar_produccion',
            ruta: '/api/produccion',
            metodo: 'GET',
            resumen: `Producción consultada para salón ${salon || 'sin_salon'}`,
            detalle: {
                fechaInicio,
                previa: Boolean(previa),
                hastaUltimo,
                salon,
                filas: groupedProducciones.length,
            },
        });

        return NextResponse.json({ success: true, data: groupedProducciones });
    } catch (error) {
        await logAudit({
            modulo: 'produccion',
            accion: 'consultar_produccion',
            ruta: '/api/produccion',
            metodo: 'GET',
            estado: 'error',
            resumen: 'Error consultando producción',
            detalle: {
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al consultar producción' },
            { status: 500 },
        );
    }
}

const updateGestionadoPlato = async (platoCodigo: string) => {
    try {
        const updatedPlato = await prisma.plato.updateMany({
            where: { codigo: platoCodigo, gestionado: false },
            data: { gestionado: true },
        });
        return updatedPlato;
    } catch (error) {
        console.error('Error updating gestionado for plato:', error);
        throw new Error('Error updating gestionado');
    }
};
