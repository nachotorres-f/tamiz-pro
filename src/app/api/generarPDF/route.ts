/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
//import { addDays, startOfWeek } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    try {
        const { searchParams } = req.nextUrl;
        const plato = searchParams.get('plato');
        const fechaInicio = searchParams.get('fechaInicio');
        const salon = searchParams.get('salon');

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

        if (!salon) {
            return NextResponse.json(
                { error: 'salon es requerido' },
                { status: 400 }
            );
        }

        const fecha = new Date(fechaInicio.split('T')[0]);

        const producciones = await prisma.produccion.findMany({
            where: {
                plato: plato,
                fecha: fecha,
                salon: salon,
            },
        });

        console.log('PRODUCCIONES', producciones);

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

        console.log('INGREDIENTES', ingredientes);

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

        console.log('TABLE DTA', tableData);

        const data = producciones.map((produccion) => {
            console.log('PRE DATA', produccion);
            return {
                ...produccion,
                ingredientes: tableData, // Si cada producción tiene ingredientes distintos, deberías obtenerlos aquí
            };
        });
        producciones.forEach((produccion) => {
            console.log('POST DATA', produccion);
        });

        console.log('DATA', data);

        return NextResponse.json({ data }, { status: 200 });
    } catch {
        return NextResponse.json(
            { success: false, message: 'Error interno' },
            { status: 500 }
        );
    }
}
