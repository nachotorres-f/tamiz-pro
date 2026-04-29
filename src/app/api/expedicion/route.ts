import { prisma } from '@/lib/prisma';
import { requirePageKeyAccess } from '@/lib/page-guard';
import { addDays, startOfDay } from 'date-fns';
import { logAudit } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';
    const accessResult = await requirePageKeyAccess(req, 'expedicion');

    if (accessResult instanceof NextResponse) {
        return accessResult;
    }

    try {
        const { searchParams } = req.nextUrl;
        const salon = searchParams.get('salon') || 'A';
        const lugaresGrupoB = ['El Central', 'La Rural'];
        const usarNotIn = salon === 'A';
        const hoy = startOfDay(new Date());
        const hasta = addDays(hoy, 7);

        const eventos = await prisma.comanda.findMany({
            where: {
                fecha: {
                    gte: hoy,
                    lt: hasta,
                },
                lugar: usarNotIn ? { notIn: lugaresGrupoB } : { in: lugaresGrupoB },
            },
            orderBy: [
                { fecha: 'asc' },
                { horarioInicio: 'asc' },
                { id: 'asc' },
            ],
        });

        await logAudit({
            modulo: 'expedicion',
            accion: 'consultar_expedicion_semana',
            ruta: '/api/expedicion',
            metodo: 'GET',
            resumen: 'Consulta de expedición desde hoy a una semana',
            detalle: {
                salon,
                eventos: eventos.length,
                desde: hoy.toISOString(),
                hasta: hasta.toISOString(),
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
    } catch (error) {
        await logAudit({
            modulo: 'expedicion',
            accion: 'consultar_expedicion_semana',
            ruta: '/api/expedicion',
            metodo: 'GET',
            estado: 'error',
            resumen: 'Error consultando expedición desde hoy a una semana',
            detalle: {
                salon: req.nextUrl.searchParams.get('salon') || 'A',
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al consultar expedición' },
            { status: 500 },
        );
    }
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
