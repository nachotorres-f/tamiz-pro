/* eslint-disable @typescript-eslint/no-explicit-any */
// import { prisma } from '@/lib/prisma';
// import { NextRequest, NextResponse } from 'next/server';
// import { format, startOfWeek, addDays } from 'date-fns';

import { NextRequest, NextResponse } from 'next/server';
import { startOfWeek, addDays, format } from 'date-fns';
import { prisma } from '@/lib/prisma'; // Asumiendo que tienes prisma configurado
// import { calcularIngredientesPT } from '@/lib/calculations'; // Asumiendo la función externa

// Tipos
interface Receta {
    nombreProducto: string;
    descripcion: string;
    tipo: 'PT' | 'MP';
    porcionBruta: number;
}

interface PlatoEvento {
    plato: string;
    fecha: string;
    cantidad: number;
    gestionado: boolean;
    lugar: string;
}

// Constantes
const TIMEZONE = 'America/Argentina/Buenos_Aires';
const DIAS_SEMANA = 7;
const TIPO_RECETA_PT = 'PT';
const DIAS_PRODUCCION_EXTRA = { anterior: 1, posterior: 9 };

// Funciones auxiliares
function validarFechaInicio(fechaInicio: string | null): Date {
    if (!fechaInicio) {
        throw new Error('fechaInicio es requerido');
    }
    return new Date(fechaInicio);
}

function calcularRangoSemana(fechaInicio: string): Date {
    const fechaBase = validarFechaInicio(fechaInicio);
    return startOfWeek(addDays(fechaBase, DIAS_SEMANA), { weekStartsOn: 1 }); // Lunes como inicio de semana
}

async function obtenerNombresRecetasPT(): Promise<Set<string>> {
    const recetasPT = await prisma.receta.findMany({
        where: { tipo: TIPO_RECETA_PT },
        select: { nombreProducto: true },
    });

    return new Set(recetasPT.map((receta) => receta.nombreProducto));
}

async function obtenerEventosSemana(inicio: Date, nombresPT: Set<string>) {
    return prisma.comanda.findMany({
        where: {
            OR: [
                {
                    // condición 1: fecha + plato
                    fecha: {
                        gte: inicio,
                        lte: addDays(inicio, DIAS_SEMANA),
                    },
                    Plato: {
                        some: {
                            nombre: { in: Array.from(nombresPT) },
                        },
                    },
                },
                {
                    // condición 2: id = 1
                    id: 1,
                },
            ],
        },
        include: {
            Plato: true,
        },
    });
}

function procesarEventosAPlatos(
    eventos: any[],
    nombresPT: Set<string>
): PlatoEvento[] {
    const resultado: PlatoEvento[] = [];

    for (const evento of eventos) {
        for (const plato of evento.Plato) {
            if (nombresPT.has(plato.nombre)) {
                if (evento.id === 1) {
                    // Si el plato tiene una fecha específica, usarla
                    const fecha = format(new Date(plato.fecha), 'yyyy-MM-dd');
                    console.log(fecha);
                    resultado.push({
                        plato: plato.nombre,
                        fecha: format(addDays(fecha, 1), 'yyyy-MM-dd'),
                        cantidad: plato.cantidad,
                        gestionado: false,
                        lugar: '',
                    });
                } else {
                    resultado.push({
                        plato: plato.nombre,
                        fecha: format(addDays(evento.fecha, 1), 'yyyy-MM-dd'),
                        cantidad: plato.cantidad,
                        gestionado: plato.gestionado || false,
                        lugar: evento.lugar,
                    });
                }
            }
        }
    }

    console.log('Platos procesados:', resultado);

    return resultado.sort((a, b) => a.plato.localeCompare(b.plato));
}

async function obtenerRecetas(): Promise<Receta[]> {
    const recetasRaw = await prisma.receta.findMany({});

    return recetasRaw.map((receta) => ({
        nombreProducto: receta.nombreProducto,
        descripcion: receta.descripcion,
        tipo: receta.tipo as 'PT' | 'MP',
        porcionBruta: receta.porcionBruta,
    }));
}

async function calcularIngredientesConFormato(
    platos: PlatoEvento[],
    recetas: Receta[]
) {
    const ingredientes = await calcularIngredientesPT(platos, recetas);

    return ingredientes.map((ingrediente) => ({
        ...ingrediente,
        cantidad: parseFloat(ingrediente.cantidad.toFixed(2)),
    }));
}

async function obtenerProduccion(inicio: Date) {
    return prisma.produccion.findMany({
        where: {
            fecha: {
                gte: addDays(inicio, -DIAS_PRODUCCION_EXTRA.anterior),
                lte: addDays(inicio, DIAS_PRODUCCION_EXTRA.posterior),
            },
        },
    });
}

// Función principal del endpoint
export async function GET(req: NextRequest) {
    // Configurar zona horaria
    process.env.TZ = TIMEZONE;

    try {
        // Extraer y validar parámetros
        const { searchParams } = req.nextUrl;
        const fechaInicio = searchParams.get('fechaInicio');

        if (!fechaInicio) {
            return NextResponse.json(
                { error: 'fechaInicio es requerido' },
                { status: 400 }
            );
        }

        const inicio = calcularRangoSemana(fechaInicio);

        // Obtener datos base
        const [nombresPT, recetas] = await Promise.all([
            obtenerNombresRecetasPT(),
            obtenerRecetas(),
        ]);

        // Obtener eventos de la semana
        const eventos = await obtenerEventosSemana(inicio, nombresPT);

        // Procesar eventos a platos
        const platos = procesarEventosAPlatos(eventos, nombresPT);

        // Calcular ingredientes y obtener producción en paralelo
        const [ingredientes, produccion] = await Promise.all([
            calcularIngredientesConFormato(platos, recetas),
            obtenerProduccion(inicio),
        ]);

        return NextResponse.json({
            planifacion: ingredientes,
            produccion,
        });
    } catch (error) {
        const mensaje =
            error instanceof Error
                ? error.message
                : 'Error interno del servidor';
        const status = mensaje === 'fechaInicio es requerido' ? 400 : 500;

        return NextResponse.json({ error: mensaje }, { status });
    }
}

// export async function GET(req: NextRequest) {
//     process.env.TZ = 'America/Argentina/Buenos_Aires';

//     const { searchParams } = req.nextUrl;
//     const fechaInicio = searchParams.get('fechaInicio');

//     if (!fechaInicio) {
//         return NextResponse.json(
//             { error: 'fechaInicio es requerido' },
//             { status: 400 }
//         );
//     }

//     const inicio = startOfWeek(new Date(addDays(fechaInicio, 7)), {
//         weekStartsOn: 0,
//     }); //lunes

//     // Obtener todos los nombres de recetas PT de una vez
//     const recetasPT = await prisma.receta.findMany({
//         where: { tipo: 'PT' },
//         select: { nombreProducto: true },
//     });
//     const nombresPT = new Set(recetasPT.map((r) => r.nombreProducto));

//     // Traer solo los eventos/platos que coinciden con recetas PT
//     const eventos = await prisma.comanda.findMany({
//         where: {
//             fecha: { gte: inicio, lte: addDays(inicio, 7) },
//             Plato: {
//                 some: {
//                     nombre: { in: Array.from(nombresPT) },
//                 },
//             },
//         },
//         include: {
//             Plato: true,
//         },
//     });

//     const resultado: {
//         plato: string;
//         fecha: string;
//         cantidad: number;
//         gestionado: boolean;
//         lugar: string;
//     }[] = [];

//     for (const evento of eventos) {
//         for (const plato of evento.Plato) {
//             if (nombresPT.has(plato.nombre)) {
//                 resultado.push({
//                     plato: plato.nombre,
//                     fecha: format(addDays(evento.fecha, 2), 'yyyy-MM-dd'),
//                     cantidad: plato.cantidad,
//                     gestionado: plato.gestionado || false,
//                     lugar: evento.lugar,
//                 });
//             }
//         }
//     }

//     const recetasRaw = await prisma.receta.findMany({});
//     const recetas: Receta[] = recetasRaw.map((r) => ({
//         nombreProducto: r.nombreProducto,
//         descripcion: r.descripcion,
//         tipo: r.tipo as 'PT' | 'MP',
//         porcionBruta: r.porcionBruta,
//     }));

//     const ingredientes = (await calcularIngredientesPT(resultado, recetas)).map(
//         (i) => ({
//             ...i,
//             cantidad: parseFloat(i.cantidad.toFixed(2)), // Aseguramos que la cantidad sea un número con dos decimales
//         })
//     );

//     const produccion = await prisma.produccion.findMany({
//         where: {
//             fecha: { gte: addDays(inicio, -1), lte: addDays(inicio, 9) },
//         },
//     });

//     resultado.sort((a, b) => a.plato.localeCompare(b.plato));

//     return NextResponse.json({ planifacion: ingredientes, produccion });
// }

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { salon, produccion } = await req.json();

    if (!Array.isArray(produccion)) {
        return NextResponse.json(
            { error: 'El cuerpo debe ser un array de producciones' },
            { status: 400 }
        );
    }

    if (!salon) {
        return NextResponse.json(
            { error: 'El salón es requerido' },
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
                salon: salon,
            },
        });

        if (existe) {
            if (existe.cantidad === item.cantidad) continue; // No hay cambios

            // Si hay cambios, actualizamos la cantidad
            await prisma.produccion.update({
                where: { id: existe.id },
                data: { cantidad: item.cantidad, salon: salon },
            });
            continue;
        } else {
            // Si no existe, creamos una nueva entrada
            await prisma.produccion.create({
                data: {
                    plato: item.plato,
                    fecha: new Date(item.fecha),
                    cantidad: item.cantidad,
                    salon,
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
        if (item.fecha === '2025-07-30') console.log(item);
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
