import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { format, startOfWeek, addDays } from 'date-fns';

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const fechaInicio = searchParams.get('fechaInicio');

    if (!fechaInicio) {
        return NextResponse.json(
            { error: 'fechaInicio es requerido' },
            { status: 400 }
        );
    }

    const inicio = startOfWeek(new Date(addDays(fechaInicio, 7)), {
        weekStartsOn: 0,
    }); //lunes

    // Obtener todos los nombres de recetas PT de una vez
    const recetasPT = await prisma.receta.findMany({
        where: { tipo: 'PT' },
        select: { nombreProducto: true },
    });
    const nombresPT = new Set(recetasPT.map((r) => r.nombreProducto));

    // Traer solo los eventos/platos que coinciden con recetas PT
    const eventos = await prisma.comanda.findMany({
        where: {
            fecha: { gte: inicio, lte: addDays(inicio, 7) },
            Plato: {
                some: {
                    nombre: { in: Array.from(nombresPT) },
                },
            },
        },
        include: {
            Plato: true,
        },
    });

    const resultado: {
        plato: string;
        fecha: string;
        cantidad: number;
        gestionado: boolean;
        lugar: string;
    }[] = [];

    for (const evento of eventos) {
        for (const plato of evento.Plato) {
            if (nombresPT.has(plato.nombre)) {
                resultado.push({
                    plato: plato.nombre,
                    fecha: format(addDays(evento.fecha, 2), 'yyyy-MM-dd'),
                    cantidad: plato.cantidad,
                    gestionado: plato.gestionado || false,
                    lugar: evento.lugar,
                });
            }
        }
    }

    const recetasRaw = await prisma.receta.findMany({});
    const recetas: Receta[] = recetasRaw.map((r) => ({
        nombreProducto: r.nombreProducto,
        descripcion: r.descripcion,
        tipo: r.tipo as 'PT' | 'MP',
        porcionBruta: r.porcionBruta,
    }));

    const ingredientes = (await calcularIngredientesPT(resultado, recetas)).map(
        (i) => ({
            ...i,
            cantidad: parseFloat(i.cantidad.toFixed(2)), // Aseguramos que la cantidad sea un número con dos decimales
        })
    );

    const produccion = await prisma.produccion.findMany({
        where: {
            fecha: { gte: addDays(inicio, -1), lte: addDays(inicio, 9) },
        },
    });

    resultado.sort((a, b) => a.plato.localeCompare(b.plato));

    return NextResponse.json({ planifacion: ingredientes, produccion });
}

export async function POST(req: NextRequest) {
    const produccion = await req.json();

    if (!Array.isArray(produccion)) {
        return NextResponse.json(
            { error: 'El cuerpo debe ser un array de producciones' },
            { status: 400 }
        );
    }

    console.log('Producción recibida:', produccion);

    for (const item of produccion) {
        if (!item.plato || !item.fecha || typeof item.cantidad !== 'number') {
            return NextResponse.json(
                { error: 'Cada item debe tener plato, fecha y cantidad' },
                { status: 400 }
            );
        }

        const existe = await prisma.produccion.findFirst({
            where: {
                plato: item.plato,
                fecha: new Date(item.fecha),
            },
        });

        if (existe) {
            if (existe.cantidad === item.cantidad) continue; // No hay cambios

            // Si hay cambios, actualizamos la cantidad
            await prisma.produccion.update({
                where: { id: existe.id },
                data: { cantidad: item.cantidad },
            });
            continue;
        } else {
            // Si no existe, creamos una nueva entrada
            await prisma.produccion.create({
                data: {
                    plato: item.plato,
                    fecha: new Date(item.fecha),
                    cantidad: item.cantidad,
                },
            });
        }
    }

    return NextResponse.json({ message: 'Producción actualizada' });
}

type Plato = {
    plato: string;
    fecha: string;
    cantidad: number;
    lugar: string;
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
    lugar: string;
};

async function calcularIngredientesPT(
    platos: Plato[],
    recetas: Receta[]
): Promise<Resultado[]> {
    const resultado: Resultado[] = [];
    const visitados = new Set<string>(); // para evitar loops

    async function recorrer(
        nombre: string,
        fecha: string,
        cantidad: number,
        lugar: string
    ) {
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
                cantidad: parseFloat(cantidadTotal.toFixed(2)), // Aseguramos que la cantidad sea un número con dos decimales
                lugar,
            });

            if (!visitados.has(ingrediente)) {
                visitados.add(ingrediente);
                await recorrer(
                    ingrediente,
                    fecha,
                    parseFloat(cantidadTotal.toFixed(2)),
                    lugar
                );
            }
        }
    }

    for (const item of platos) {
        await recorrer(item.plato, item.fecha, item.cantidad, item.lugar);
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
