import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { addDays, startOfWeek } from 'date-fns';

function normalizarTexto(valor: string | null | undefined): string {
    return (valor ?? '').trim();
}

async function resolverCodigoPorNombre(nombrePlato: string): Promise<string> {
    const receta = await prisma.receta.findFirst({
        where: {
            OR: [
                { nombreProducto: nombrePlato },
                { descripcion: nombrePlato },
            ],
        },
        select: {
            codigo: true,
            subCodigo: true,
            nombreProducto: true,
            descripcion: true,
        },
        orderBy: {
            id: 'asc',
        },
    });

    if (!receta) {
        return '';
    }

    if (normalizarTexto(receta.descripcion) === normalizarTexto(nombrePlato)) {
        return normalizarTexto(receta.subCodigo);
    }

    return normalizarTexto(receta.codigo);
}

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const nombrePlato = searchParams.get('nombrePlato');
    const platoCodigoParam = searchParams.get('platoCodigo');
    const fechaInicio = searchParams.get('fechaInicio');

    if ((nombrePlato === null && platoCodigoParam === null) || fechaInicio === null) {
        return NextResponse.json(
            {
                error:
                    'Faltan parámetros requeridos: nombrePlato/platoCodigo o fechaInicio',
            },
            { status: 400 },
        );
    }

    const codigoBuscado =
        normalizarTexto(platoCodigoParam) ||
        (nombrePlato ? await resolverCodigoPorNombre(nombrePlato) : '');

    if (!codigoBuscado) {
        return NextResponse.json({ plato: [] });
    }

    const inicio = startOfWeek(new Date(fechaInicio), { weekStartsOn: 0 });
    const fin = addDays(inicio, 6);

    const plato = await buscarPlato(codigoBuscado, inicio, fin);

    return NextResponse.json({ plato });
}

const buscarPlato = async (codigoBuscado: string, inicio: Date, fin: Date) => {
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
        const codigoProducto = normalizarTexto(producto.codigo);

        if (!codigoProducto) {
            continue;
        }

        let cantidad = 0;
        cantidad += await buscarIngredientes(codigoProducto, codigoBuscado);

        if (cantidad === 0) {
            continue;
        }

        listProducto.push({
            ...producto,
            cantidad: producto.cantidad * cantidad,
        });
    }

    return listProducto;
};

const buscarIngredientes = async (
    codigoPlato: string,
    codigoIngredienteBuscar: string,
): Promise<number> => {
    let cantidad = 0;

    const ingredientes = await prisma.receta.findMany({
        where: {
            codigo: codigoPlato,
            tipo: 'PT',
        },
        select: {
            id: true,
            codigo: true,
            subCodigo: true,
            porcionBruta: true,
        },
    });

    if (ingredientes.length === 0) {
        return 0;
    }

    const existe = ingredientes.some((ingrediente) => {
        return normalizarTexto(ingrediente.subCodigo) === codigoIngredienteBuscar;
    });

    if (!existe) {
        for (const ingrediente of ingredientes) {
            const subCodigo = normalizarTexto(ingrediente.subCodigo);
            if (!subCodigo) {
                continue;
            }

            const subCantidad = await buscarIngredientes(
                subCodigo,
                codigoIngredienteBuscar,
            );
            cantidad += subCantidad;
        }
    }

    if (existe) {
        const ingrediente = ingredientes.find((item) => {
            return normalizarTexto(item.subCodigo) === codigoIngredienteBuscar;
        });

        cantidad += ingrediente ? ingrediente.porcionBruta : 0;
    }

    return cantidad;
};
