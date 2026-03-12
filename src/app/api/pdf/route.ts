import { prisma } from '@/lib/prisma';
import { addDays, set } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

interface BodyRequest {
    listaPlatos: string[];
    fecha: string;
    salon: string;
}

interface Produccion {
    plato: string;
    platoCodigo: string;
    platoPadre: string;
    platoPadreCodigo: string;
    cantidad: number;
    observacion: string | null;
    fecha: Date;
    salon: string | null;
}

function normalizarTexto(valor: string | null | undefined): string {
    return (valor ?? '').trim();
}

const ordenProduccion = {
    platoCodigo: 'asc' as const,
};

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    try {
        const { listaPlatos, fecha, salon }: BodyRequest = await req.json();

        if (!salon) {
            return NextResponse.json(
                { error: 'Salon es requerido' },
                { status: 400 },
            );
        }

        if (!fecha) {
            return NextResponse.json(
                { error: 'Fecha es requerido' },
                { status: 400 },
            );
        }

        const fechaProduccion = new Date(fecha);

        const data =
            listaPlatos.length > 0
                ? await buscarProduccionPorPlato(
                      fechaProduccion,
                      salon,
                      listaPlatos,
                  )
                : await buscarProduccionPorFecha(fechaProduccion, salon);

        return NextResponse.json(data, { status: 200 });
    } catch {
        return NextResponse.json(
            {
                success: false,
                message: 'Error al obtener la informacion para el PDF',
            },
            { status: 500 },
        );
    }
}

const buscarProduccionPorFecha = async (fecha: Date, salon: string) => {
    const gte = addDays(set(fecha, { hours: 0, minutes: 0, seconds: 0 }), -1);
    const lte = addDays(
        set(fecha, { hours: 23, minutes: 59, seconds: 59 }),
        -1,
    );

    const produccionList = await prisma.produccion.findMany({
        where: {
            fecha: {
                gte,
                lte,
            },
            cantidad: {
                gt: 0,
            },
            salon,
        },
        orderBy: ordenProduccion,
    });

    return Promise.all(produccionList.map(buscarReceta));
};

const buscarProduccionPorPlato = async (
    fecha: Date,
    salon: string,
    platosCodigos: string[],
) => {
    const gte = addDays(set(fecha, { hours: 0, minutes: 0, seconds: 0 }), -1);
    const lte = addDays(
        set(fecha, { hours: 23, minutes: 59, seconds: 59 }),
        -1,
    );

    const produccionList = await prisma.produccion.findMany({
        where: {
            fecha: {
                gte,
                lte,
            },
            cantidad: {
                gt: 0,
            },
            salon,
            platoCodigo: { in: platosCodigos },
        },
        orderBy: ordenProduccion,
    });

    return Promise.all(produccionList.map(buscarReceta));
};

const buscarReceta = async ({
    plato,
    platoCodigo,
    platoPadre,
    platoPadreCodigo,
    cantidad,
    observacion,
    fecha,
    salon,
}: Produccion) => {
    const recetas = await prisma.receta.findMany({
        where: {
            codigo: platoCodigo,
        },
    });

    const nombrePlato =
        normalizarTexto(recetas[0]?.nombreProducto) || normalizarTexto(plato);
    const codigoPadre = normalizarTexto(platoPadreCodigo);

    let nombrePlatoPadre = normalizarTexto(platoPadre);
    if (codigoPadre) {
        const recetaPadre = await prisma.receta.findFirst({
            where: {
                codigo: codigoPadre,
            },
            select: {
                nombreProducto: true,
            },
            orderBy: {
                id: 'asc',
            },
        });

        nombrePlatoPadre =
            normalizarTexto(recetaPadre?.nombreProducto) ||
            nombrePlatoPadre ||
            codigoPadre;
    }

    return {
        plato: nombrePlato,
        platoCodigo,
        platoPadre: nombrePlatoPadre,
        platoPadreCodigo: codigoPadre,
        codigo: platoCodigo || 'No hay codigo',
        cantidad,
        unidadMedida: recetas[0]?.unidadMedida || 'Porciones',
        observacion,
        fecha,
        salon,
        ingredientes: recetas.map(
            ({ subCodigo, descripcion, unidadMedida, porcionBruta }) => [
                subCodigo,
                descripcion,
                unidadMedida,
                (porcionBruta * cantidad).toFixed(4),
            ],
        ),
    };
};
