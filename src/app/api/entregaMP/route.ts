import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { format, startOfWeek, addDays } from 'date-fns';

type Plato = {
    plato: string;
    fecha: string;
    cantidad: number;
};

type Receta = {
    nombreProducto: string;
    descripcion: string;
    tipo: 'PT' | 'MP';
    porcionBruta: number;
};

type Resultado = {
    plato: string;
    fecha: string;
    cantidad: number;
};

async function calcularIngredientesPT(
    platos: Plato[],
    recetas: Receta[]
): Promise<Resultado[]> {
    const resultado: Resultado[] = [];
    const visitados = new Set<string>(); // para evitar loops

    async function recorrer(nombre: string, fecha: string, cantidad: number) {
        const subRecetas = recetas.filter(
            (r) => r.nombreProducto === nombre && r.tipo === 'PT'
        );

        for (const receta of subRecetas) {
            const ingrediente = receta.descripcion;
            const porcion = receta.porcionBruta || 1;
            const cantidadTotal = cantidad * porcion;

            resultado.push({
                plato: ingrediente,
                fecha,
                cantidad: cantidadTotal,
            });

            if (!visitados.has(ingrediente)) {
                visitados.add(ingrediente);
                await recorrer(ingrediente, fecha, cantidadTotal);
            }
        }
    }

    for (const item of platos) {
        await recorrer(item.plato, item.fecha, item.cantidad);
    }

    // Agrupar por ingrediente + fecha y sumar
    const agrupado = new Map<string, Resultado>();

    for (const item of resultado) {
        const key = `${item.plato}_${item.fecha}`;
        if (!agrupado.has(key)) {
            agrupado.set(key, { ...item });
        } else {
            agrupado.get(key)!.cantidad += item.cantidad;
        }
    }

    return Array.from(agrupado.values());
}

export async function GET() {
    const fechaBase = new Date();
    const inicio = startOfWeek(fechaBase, { weekStartsOn: 0 });

    const eventos = await prisma.comanda.findMany({
        where: {
            fecha: {
                gte: inicio,
            },
        },
        include: {
            Plato: true,
        },
    });

    const resultado: { plato: string; fecha: string; cantidad: number }[] = [];

    for (const evento of eventos) {
        for (const plato of evento.Plato) {
            resultado.push({
                plato: plato.nombre,
                fecha: format(addDays(evento.fecha, 1), 'yyyy-MM-dd'),
                cantidad: plato.cantidad,
            });
        }
    }

    resultado.sort((a, b) => a.plato.localeCompare(b.plato));

    const recetasRaw = await prisma.receta.findMany({});
    const recetas: Receta[] = recetasRaw.map((r) => ({
        nombreProducto: r.nombreProducto,
        descripcion: r.descripcion,
        tipo: r.tipo as 'PT' | 'MP',
        porcionBruta: r.porcionBruta,
    }));

    const ingredientes = await calcularIngredientesPT(resultado, recetas);

    // console.log(
    //     'INGREDIENTES',
    //     ingredientes.sort((a, b) => a.ingrediente.localeCompare(b.ingrediente))
    // );

    // console.log(resultado[0]);
    // console.log(ingredientes[0]);

    //console.log('RESULTADO', resultado); // todos los ingredientes PT sin repetir

    return NextResponse.json(ingredientes);
}

interface BODY {
    ingrediente: string;
    produccion: { fecha: string; cantidad: number }[];
}

export async function POST(req: NextRequest) {
    const body: BODY = await req.json();

    for (const { fecha, cantidad } of body.produccion) {
        const fechaSinHora = new Date(fecha);
        fechaSinHora.setHours(0, 0, 0, 0);

        const existente = await prisma.produccion.findFirst({
            where: {
                plato: body.ingrediente,
                fecha: fechaSinHora,
            },
        });

        if (existente) {
            await prisma.produccion.update({
                where: { id: existente.id },
                data: {
                    cantidad,
                },
            });
        } else {
            if (cantidad === 0) {
                // Si la cantidad es 0, no creamos un registro
                continue;
            }

            await prisma.produccion.create({
                data: {
                    plato: body.ingrediente,
                    fecha: fechaSinHora,
                    cantidad,
                },
            });
        }
    }

    return NextResponse.json({ success: true }, { status: 201 });
}
