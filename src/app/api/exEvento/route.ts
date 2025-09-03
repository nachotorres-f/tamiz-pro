/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export interface Receta {
    id: string;
    nombreProducto: string;
    descripcion: string;
    // otras propiedades...
}

export interface IngredienteConRuta {
    ingrediente: string;
    ruta: string[];
    nivel: number;
}

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const id = searchParams.get('id');

    const eventos = await prisma.comanda.findMany({
        where: {
            id: id ? Number(id) : undefined,
        },
        include: {
            Plato: true,
        },
    });

    const resultados: any[] = [];

    async function recorrerPropio(plato: string, cantidad: number) {
        const recetasFind = await prisma.receta.findMany({
            where: {
                nombreProducto: plato,
            },
        });

        const recetasCantidad = recetasFind.map((receta) => {
            return {
                ...receta,
                porcionBruta: receta.porcionBruta * cantidad,
            };
        });

        resultados.push(...recetasCantidad);

        const filtroPT = recetasCantidad.filter(
            (receta) => receta.tipo === 'PT'
        );

        if (filtroPT.length === 0) return;

        for (const platoPT of filtroPT) {
            await recorrerPropio(platoPT.descripcion, platoPT.porcionBruta);
        }

        // for (const platoPT of filtroPT) {
        //     await recorrerPropio(platoPT.descripcion);
        // }
    }

    for (const evento of eventos) {
        for (const plato of evento.Plato) {
            await recorrerPropio(plato.nombre, plato.cantidad);
        }
    }

    // //Para cada evento, obtenemos los ingredientes recursivamente
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

    return NextResponse.json(resultados);
}
