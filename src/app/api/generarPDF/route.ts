/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { addDays, startOfWeek } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = req.nextUrl;
        const plato = searchParams.get('plato');
        const fechaInicio = searchParams.get('fechaInicio');

        if (plato === '' || plato === null) {
            return NextResponse.json({
                json: 400,
                message: 'Se debe especificar el plato',
            });
        }

        if (!fechaInicio) {
            return NextResponse.json(
                { error: 'fechaInicio es requerido' },
                { status: 400 }
            );
        }

        const inicio = startOfWeek(new Date(fechaInicio), { weekStartsOn: 4 });

        const producciones = await prisma.produccion.findMany({
            where: {
                plato,
                fecha: {
                    gte: addDays(inicio, -1),
                },
            },
        });

        console.log(producciones);

        async function fetchIngredientesRecursivos(
            nombreProducto: string
        ): Promise<any[]> {
            const ingredientes = await prisma.receta.findMany({
                where: {
                    nombreProducto,
                },
            });

            const ingredientesExpandidos = await Promise.all(
                ingredientes.map(async (ingrediente) => {
                    if (ingrediente.tipo === 'PT') {
                        const subIngredientes =
                            await fetchIngredientesRecursivos(
                                ingrediente.descripcion
                            );
                        return {
                            ...ingrediente,
                            subIngredientes,
                        };
                    }
                    return ingrediente;
                })
            );

            return ingredientesExpandidos;
        }

        const ingredientes = await fetchIngredientesRecursivos(plato || '');

        function buildTableData(
            ingredientes: any[],
            depth = 0,
            parentPT = ''
        ): any[] {
            return ingredientes.flatMap((ingrediente) => {
                const currentParentPT =
                    ingrediente.tipo === 'PT'
                        ? ingrediente.descripcion
                        : parentPT;

                const row = {
                    nombre: ingrediente.descripcion,
                    porcionBruta: ingrediente.porcionBruta,
                    unidadMedida: ingrediente.unidadMedida,
                    tipo: ingrediente.tipo,
                    cantidad: ingrediente.cantidad,
                    codigo: ingrediente.subCodigo,
                    id: ingrediente.id,
                    depth,
                    parentPT: parentPT,
                };

                if (ingrediente.subIngredientes) {
                    return [
                        row,
                        ...buildTableData(
                            ingrediente.subIngredientes,
                            depth + 1,
                            currentParentPT
                        ),
                    ];
                }

                return [row];
            });
        }

        const tableData = buildTableData(ingredientes);

        const data = producciones.map((produccion) => {
            return {
                ...produccion,
                ingredientes: tableData,
            };
        });

        return NextResponse.json({ data }, { status: 200 });
    } catch {
        return NextResponse.json(
            { success: false, message: 'Error interno' },
            { status: 500 }
        );
    }
}
