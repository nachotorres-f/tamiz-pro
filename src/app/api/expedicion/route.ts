import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { startOfWeek, addDays } from 'date-fns';

export async function GET() {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const eventos = await prisma.comanda.findMany({
        where: {
            fecha: {
                gte: startOfWeek(new Date(), { weekStartsOn: 1 }),
                lt: addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7),
            },
        },
    });

    // Para cada evento, obtenemos los ingredientes recursivamente
    // const eventosConIngredientes = [];
    // for (const evento of eventos) {
    //     const ingredientes: any[] = [];
    //     for (const plato of evento.Plato) {
    //         const ingredientesPlato = await buscarIngredientesRecursivo(
    //             plato.nombre,
    //             plato.cantidad
    //         );
    //         ingredientes.push(...ingredientesPlato);
    //     }
    //     eventosConIngredientes.push({
    //         ...evento,
    //         ingredientes,
    //     });
    // }

    return NextResponse.json(eventos);
}

// Búsqueda recursiva de ingredientes
// const buscarIngredientesRecursivo = async (
//     nombre: string,
//     cantidadPadre: number
// ): Promise<any[]> => {
//     const ingredientes = await prisma.receta.findMany({
//         where: {
//             nombreProducto: nombre,
//         },
//     });

//     const resultado: any[] = [];

//     for (const ingrediente of ingredientes) {
//         // Multiplicamos la porción bruta por la cantidad del padre
//         const ingredienteMultiplicado = {
//             ...ingrediente,
//             porcionBruta: ingrediente.porcionBruta * cantidadPadre,
//         };
//         resultado.push(ingredienteMultiplicado);

//         // Buscamos ingredientes hijos recursivamente
//         const hijos = await buscarIngredientesRecursivo(
//             ingrediente.descripcion,
//             ingredienteMultiplicado.porcionBruta
//         );
//         resultado.push(...hijos);
//     }

//     return resultado;
// };
