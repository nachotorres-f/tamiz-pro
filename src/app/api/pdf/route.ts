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
    cantidad: number;
    observacion: string | null;
    fecha: Date;
    salon: string | null;
}

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    try {
        const { listaPlatos, fecha, salon }: BodyRequest = await req.json();

        if (!salon) {
            return NextResponse.json(
                { error: 'Salon es requerido' },
                { status: 400 }
            );
        }

        if (!fecha) {
            return NextResponse.json(
                { error: 'Fecha es requerido' },
                { status: 400 }
            );
        }

        const fechaProduccion = new Date(fecha);

        const data =
            listaPlatos.length > 0
                ? await buscarProduccionPorPlato(
                      fechaProduccion,
                      salon,
                      listaPlatos
                  )
                : await buscarProduccionPorFecha(fechaProduccion, salon);

        return NextResponse.json(data, { status: 200 });
    } catch {
        return NextResponse.json(
            {
                success: false,
                message: 'Error al obtener la informacion para el PDF',
            },
            { status: 500 }
        );
    }
}

const buscarProduccionPorFecha = async (fecha: Date, salon: string) => {
    const gte = addDays(set(fecha, { hours: 0, minutes: 0, seconds: 0 }), -1);
    const lte = addDays(
        set(fecha, { hours: 23, minutes: 59, seconds: 59 }),
        -1
    );

    const produccionList = await prisma.produccion.findMany({
        where: {
            fecha: {
                gte,
                lte,
            },
            salon,
        },
    });

    return Promise.all(produccionList.map(buscarReceta));
};

const buscarProduccionPorPlato = async (
    fecha: Date,
    salon: string,
    plato: string[]
) => {
    const gte = addDays(set(fecha, { hours: 0, minutes: 0, seconds: 0 }), -1);
    const lte = addDays(
        set(fecha, { hours: 23, minutes: 59, seconds: 59 }),
        -1
    );
    const produccionList = await prisma.produccion.findMany({
        where: {
            fecha: {
                gte,
                lte,
            },
            salon,
            plato: { in: plato },
        },
    });

    return Promise.all(produccionList.map(buscarReceta));
};

const buscarReceta = async ({
    plato,
    cantidad,
    observacion,
    fecha,
    salon,
}: Produccion) => {
    const recetas = await prisma.receta.findMany({
        where: {
            nombreProducto: plato,
        },
    });

    const platoData = await prisma.receta.findFirst({
        select: {
            unidadMedida: true,
        },
        where: {
            descripcion: plato,
            proceso: 'Plato Terminado',
        },
    });

    return {
        plato,
        codigo: recetas[0]?.codigo || 'No hay codigo',
        cantidad,
        unidadMedida: platoData?.unidadMedida || 'Porciones',
        observacion,
        fecha,
        salon,
        ingredientes: recetas.map(
            ({ subCodigo, descripcion, unidadMedida, porcionBruta }) => [
                subCodigo,
                descripcion,
                unidadMedida,
                (porcionBruta * cantidad).toFixed(2),
            ]
        ),
    };
};
