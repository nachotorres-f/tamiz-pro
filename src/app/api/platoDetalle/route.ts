import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { addDays, startOfWeek } from 'date-fns';

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const nombrePlato = searchParams.get('nombrePlato');
    const fechaInicio = searchParams.get('fechaInicio');

    if (nombrePlato === null || fechaInicio === null) {
        return NextResponse.json(
            {
                error: 'Faltan parámetros requeridos: nombrePlato o fechaInicio',
            },
            { status: 400 }
        );
    }

    const inicio = startOfWeek(new Date(fechaInicio), { weekStartsOn: 0 });
    const fin = addDays(inicio, 6);

    // const plato = await prisma.plato.findMany({
    //     where: {
    //         comanda: {
    //             fecha: {
    //                 gte: inicio,
    //                 lt: fin,
    //             },
    //         },
    //     },
    //     orderBy: {
    //         comanda: {
    //             fecha: 'asc',
    //         },
    //     },
    //     include: {
    //         comanda: true,
    //     },
    // });

    const plato = await buscarPlato(nombrePlato, inicio, fin);

    // const produccionesSelect = await prisma.produccion.findMany({
    //     where: {
    //         plato: nombrePlato || '',
    //         fecha: {
    //             gte: addDays(inicio, -1),
    //         },
    //     },
    // });

    // const producciones = produccionesSelect.map((produccion) => ({
    //     fecha: addDays(produccion.fecha, 1),
    //     cantidad: produccion.cantidad,
    // }));

    // async function fetchIngredientesRecursivos(
    //     nombreProducto: string
    // ): Promise<any[]> {
    //     const ingredientes = await prisma.receta.findMany({
    //         where: {
    //             nombreProducto,
    //         },
    //     });

    //     const ingredientesExpandidos = await Promise.all(
    //         ingredientes.map(async (ingrediente) => {
    //             if (ingrediente.tipo === 'PT') {
    //                 const subIngredientes = await fetchIngredientesRecursivos(
    //                     ingrediente.descripcion
    //                 );
    //                 return {
    //                     ...ingrediente,
    //                     subIngredientes,
    //                 };
    //             }
    //             return ingrediente;
    //         })
    //     );

    //     return ingredientesExpandidos;
    // }

    // const ingredientes = await fetchIngredientesRecursivos(nombrePlato || '');

    // function buildTableData(
    //     ingredientes: any[],
    //     depth = 0,
    //     parentPT = ''
    // ): any[] {
    //     return ingredientes.flatMap((ingrediente) => {
    //         const currentParentPT =
    //             ingrediente.tipo === 'PT' ? ingrediente.descripcion : parentPT;

    //         const row = {
    //             nombre: ingrediente.descripcion,
    //             porcionBruta: ingrediente.porcionBruta,
    //             unidadMedida: ingrediente.unidadMedida,
    //             tipo: ingrediente.tipo,
    //             cantidad: ingrediente.cantidad,
    //             depth,
    //             parentPT: parentPT,
    //         };

    //         if (ingrediente.subIngredientes) {
    //             return [
    //                 row,
    //                 ...buildTableData(
    //                     ingrediente.subIngredientes,
    //                     depth + 1,
    //                     currentParentPT
    //                 ),
    //             ];
    //         }

    //         return [row];
    //     });
    // }

    // const tableData = buildTableData(ingredientes);

    // const tableDataFiltered = tableData.filter((item) => item.tipo === 'PT');

    console.log(plato);

    return NextResponse.json({
        plato,
        // producciones,
        // ingredientes: tableDataFiltered,
    });
}

const buscarPlato = async (nombrePlato: string, inicio: Date, fin: Date) => {
    const productosComandas = await prisma.plato.findMany({
        where: {
            comanda: {
                fecha: {
                    gte: inicio,
                    lt: fin,
                },
            },
        },
        include: {
            comanda: true,
        },
    });

    const listProducto = [];

    for (const producto of productosComandas) {
        let cantidad = 0;
        cantidad += await buscarIngredientes(producto.nombre, nombrePlato);

        if (cantidad === 0) {
            continue;
        }

        if (producto.nombre === 'Tapeo de Quesos Y Fiambres') {
            console.log('Cantidad de tapeo: ', producto.cantidad);
            console.log('Cantidad de la receta x 1', cantidad);
            console.log('RSULTADO', producto.cantidad * cantidad);
        }
        listProducto.push({
            ...producto,
            cantidad: producto.cantidad * cantidad,
        });

        // console.log(
        //     `ID: ${producto.id} - Cantidad: ${producto.cantidad} de ${
        //         producto.nombre
        //     } en ${
        //         producto.comanda.nombre
        //     } (${producto.comanda.fecha.toISOString()}): ${cantidad}`
        // );
        // console.log('##########################');
        // console.log('');
    }

    // console.log('FIN');

    return listProducto;
};

const buscarIngredientes = async (
    nombrePlato: string,
    ingredienteBuscar: string
): Promise<number> => {
    let cantidad = 0;

    const ingredientes = await prisma.receta.findMany({
        where: {
            nombreProducto: nombrePlato,
            tipo: 'PT',
        },
        select: {
            id: true,
            nombreProducto: true,
            descripcion: true,
            porcionBruta: true,
        },
    });

    if (ingredientes.length === 0) {
        return 0;
    }

    const existe = ingredientes.some((ingrediente) => {
        if (ingrediente.descripcion === ingredienteBuscar) {
            console.log('\n', ingredientes, '\n');

            // console.log('');
            // console.log(
            //     `ID ${ingrediente.id} - Ingrediente encontrado: ${ingrediente.nombreProducto}, cantidad: ${ingrediente.porcionBruta})`
            // );
            // console.log('');
            return true; // Encontrado, salir del bucle
        }
        return false; // Continuar buscando
    });

    if (!existe) {
        for (const ingrediente of ingredientes) {
            const subCantidad = await buscarIngredientes(
                ingrediente.descripcion,
                ingredienteBuscar
            );
            cantidad += subCantidad;
        }
    }

    if (existe) {
        const ingrediente = ingredientes.find((ingrediente) => {
            if (ingrediente.descripcion === ingredienteBuscar) {
                return true; // Encontrado, salir del bucle
            }
            return false; // Continuar buscando
        });

        cantidad += ingrediente ? ingrediente.porcionBruta : 0;
    }

    return cantidad;
};
