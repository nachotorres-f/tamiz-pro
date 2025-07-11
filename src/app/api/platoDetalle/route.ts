/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { addDays, startOfWeek } from 'date-fns';

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const nombrePlato = searchParams.get('nombrePlato');

    const fechaBase = new Date();
    const inicio = startOfWeek(fechaBase, { weekStartsOn: 0 });

    const plato = await prisma.plato.findMany({
        where: {
            nombre: nombrePlato || '',
            comanda: {
                fecha: {
                    gte: inicio,
                },
            },
        },
        orderBy: {
            comanda: {
                fecha: 'asc',
            },
        },
        include: {
            comanda: true,
        },
    });

    const produccionesSelect = await prisma.produccion.findMany({
        where: {
            plato: nombrePlato || '',
            fecha: {
                gte: addDays(inicio, -1),
            },
        },
    });

    const producciones = produccionesSelect.map((produccion) => ({
        fecha: addDays(produccion.fecha, 1),
        cantidad: produccion.cantidad,
    }));

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
                    const subIngredientes = await fetchIngredientesRecursivos(
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

    const ingredientes = await fetchIngredientesRecursivos(nombrePlato || '');

    function buildTableData(
        ingredientes: any[],
        depth = 0,
        parentPT = ''
    ): any[] {
        return ingredientes.flatMap((ingrediente) => {
            const currentParentPT =
                ingrediente.tipo === 'PT' ? ingrediente.descripcion : parentPT;

            const row = {
                nombre: ingrediente.descripcion,
                porcionBruta: ingrediente.porcionBruta,
                unidadMedida: ingrediente.unidadMedida,
                tipo: ingrediente.tipo,
                cantidad: ingrediente.cantidad,
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

    const tableDataFiltered = tableData.filter((item) => item.tipo === 'PT');

    return NextResponse.json({
        plato,
        producciones,
        ingredientes: tableDataFiltered,
    });
}
