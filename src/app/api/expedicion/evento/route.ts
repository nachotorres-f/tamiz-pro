/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const id = searchParams.get('id');

    try {
        const eventos = await prisma.comanda.findMany({
            where: {
                id: id ? Number(id) : undefined,
            },
            include: {
                Plato: true,
            },
        });

        //Para cada evento, obtenemos los ingredientes recursivamente
        const eventosConIngredientes = [];
        for (const evento of eventos) {
            const ingredientes: any[] = [];
            for (const plato of evento.Plato) {
                const ingredientesPlato = await buscarIngredientesRecursivo(
                    plato.codigo || plato.nombre,
                    plato.cantidad,
                );
                ingredientes.push(...ingredientesPlato);
            }
            eventosConIngredientes.push({
                ...evento,
                ingredientes,
            });
        }

        await logAudit({
            modulo: 'expedicion',
            accion: 'consultar_expedicion_evento_legacy',
            ruta: '/api/expedicion/evento',
            metodo: 'GET',
            resumen: `Consulta de evento de expedición ${id || 'sin_id'}`,
            detalle: {
                id: id ? Number(id) : null,
                eventos: eventos.length,
            },
        });

        return NextResponse.json(eventos);
    } catch (error) {
        await logAudit({
            modulo: 'expedicion',
            accion: 'consultar_expedicion_evento_legacy',
            ruta: '/api/expedicion/evento',
            metodo: 'GET',
            estado: 'error',
            resumen: 'Error consultando evento de expedición legacy',
            detalle: {
                id: id ? Number(id) : null,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al consultar evento de expedición' },
            { status: 500 },
        );
    }
}

// Búsqueda recursiva de ingredientes
const buscarIngredientesRecursivo = async (
    codigoONombre: string,
    cantidadPadre: number
): Promise<any[]> => {
    const ingredientes = await prisma.receta.findMany({
        where: {
            OR: [{ codigo: codigoONombre }, { nombreProducto: codigoONombre }],
        },
    });

    const resultado: any[] = [];

    for (const ingrediente of ingredientes) {
        // Multiplicamos la porción bruta por la cantidad del padre
        const ingredienteMultiplicado = {
            ...ingrediente,
            porcionBruta: ingrediente.porcionBruta * cantidadPadre,
        };
        resultado.push(ingredienteMultiplicado);

        // Buscamos ingredientes hijos recursivamente
        const hijos = await buscarIngredientesRecursivo(
            ingrediente.subCodigo || ingrediente.descripcion,
            ingredienteMultiplicado.porcionBruta
        );
        resultado.push(...hijos);
    }

    return resultado;
};
