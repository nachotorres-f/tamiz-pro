/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';

function normalizarTexto(valor: string | null | undefined): string {
    return (valor ?? '').trim();
}

function normalizarClave(valor: string | null | undefined): string {
    return normalizarTexto(valor).toLocaleLowerCase('es');
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

    const platoCodigo =
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
            return newProduccion;
        }),
    );

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

    return NextResponse.json({ success: true, data });
}

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const fechaInicio = searchParams.get('fechaInicio');

    if (!fechaInicio) {
        return NextResponse.json(
            { error: 'fechaInicio es requerido' },
            { status: 400 },
        );
    }

    const desde = addDays(new Date(fechaInicio), 2);
    desde.setHours(0, 0, 0, 0);
    const hasta = addDays(desde, 6);
    hasta.setHours(0, 0, 0, 0);

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
            existingPlato.produccion.push({
                fecha: addDays(produccion.fecha, -1),
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
                        fecha: addDays(produccion.fecha, -1),
                        cantidad: produccion.cantidad,
                        comentario:
                            (produccion.observacionProduccion || '') + '\n',
                    },
                ],
                salon: produccion.salon,
            });
        }
    }

    return NextResponse.json({ success: true, data: groupedProducciones });
}
