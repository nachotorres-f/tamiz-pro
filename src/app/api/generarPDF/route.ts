/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

function normalizarTexto(valor: string | null | undefined): string {
    return (valor ?? '').trim();
}

async function resolverCodigoPorNombre(nombre: string): Promise<string> {
    const receta = await prisma.receta.findFirst({
        where: {
            nombreProducto: nombre,
        },
        select: {
            codigo: true,
        },
        orderBy: {
            id: 'asc',
        },
    });

    return normalizarTexto(receta?.codigo);
}

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    try {
        const { searchParams } = req.nextUrl;
        const plato = searchParams.get('plato');
        const platoCodigoParam = searchParams.get('platoCodigo');
        const fechaInicio = searchParams.get('fechaInicio');
        const salon = searchParams.get('salon');

        if ((plato === '' || plato === null) && !platoCodigoParam) {
            return NextResponse.json({
                json: 400,
                message: 'Se debe especificar el plato',
            });
        }

        if (!fechaInicio) {
            return NextResponse.json(
                { error: 'fechaInicio es requerido' },
                { status: 400 },
            );
        }

        if (!salon) {
            return NextResponse.json(
                { error: 'salon es requerido' },
                { status: 400 },
            );
        }

        const platoCodigo =
            normalizarTexto(platoCodigoParam) ||
            (plato ? await resolverCodigoPorNombre(plato) : '');

        if (!platoCodigo) {
            return NextResponse.json(
                { error: 'No se pudo resolver código de plato' },
                { status: 400 },
            );
        }

        const fecha = new Date(fechaInicio.split('T')[0]);

        const producciones = await prisma.produccion.findMany({
            where: {
                platoCodigo,
                fecha,
                salon,
            },
        });

        async function fetchIngredientesRecursivos(codigo: string): Promise<any[]> {
            const ingredientes = await prisma.receta.findMany({
                where: {
                    codigo,
                },
            });

            const ingredientesExpandidos = await Promise.all(
                ingredientes.map(async (ingrediente) => {
                    if (ingrediente.tipo === 'PT' && ingrediente.subCodigo) {
                        const subIngredientes = await fetchIngredientesRecursivos(
                            ingrediente.subCodigo,
                        );
                        return {
                            ...ingrediente,
                            subIngredientes,
                        };
                    }
                    return ingrediente;
                }),
            );

            return ingredientesExpandidos;
        }

        const ingredientes = await fetchIngredientesRecursivos(platoCodigo);

        function buildTableData(
            ingredientesTabla: any[],
            depth = 0,
            parentPT = '',
        ): any[] {
            return ingredientesTabla.flatMap((ingrediente) => {
                const currentParentPT =
                    ingrediente.tipo === 'PT' ? ingrediente.descripcion : parentPT;

                const row = {
                    nombre: ingrediente.descripcion,
                    porcionBruta: ingrediente.porcionBruta,
                    unidadMedida: ingrediente.unidadMedida,
                    tipo: ingrediente.tipo,
                    cantidad: ingrediente.cantidad,
                    codigo: ingrediente.subCodigo,
                    id: ingrediente.id,
                    depth,
                    parentPT,
                };

                if (ingrediente.subIngredientes) {
                    return [
                        row,
                        ...buildTableData(
                            ingrediente.subIngredientes,
                            depth + 1,
                            currentParentPT,
                        ),
                    ];
                }

                return [row];
            });
        }

        const tableData = buildTableData(ingredientes);

        const data = producciones.map((produccion) => ({
            ...produccion,
            ingredientes: tableData,
        }));

        return NextResponse.json({ data }, { status: 200 });
    } catch {
        return NextResponse.json(
            { success: false, message: 'Error interno' },
            { status: 500 },
        );
    }
}
