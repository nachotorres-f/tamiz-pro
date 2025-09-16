import { prisma } from '@/lib/prisma';
import { endOfWeek, startOfWeek } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

interface Evento {
    Plato: Plato[];
    id: number;
    lugar: string;
    salon: string;
    tipo: string;
    fecha: Date;
    nombre: string;
    horarioInicio: Date;
    horarioFin: Date;
    cantidadMayores: number;
    cantidadMenores: number;
    observaciones: string | null;
}

interface Plato {
    id: number;
    fecha: Date | null;
    nombre: string;
    cantidad: number;
    comandaId: number;
    gestionado: boolean;
}

interface Resultado {
    semi: string;
    comandas: { evento: Evento; cantidad: number }[];
}

interface Receta {
    nombreProducto: string;
    descripcion: string;
    porcionBruta: number;
    tipo: string;
    unidadMedida: string | null;
}

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const { searchParams } = req.nextUrl;
    const salon: string = searchParams.get('salon') || 'A';

    const lugares = ['El Central', 'La Rural'];
    const usarNotIn = salon === 'A';

    // 1. Una sola consulta para obtener eventos
    const eventos = await prisma.comanda.findMany({
        where: {
            fecha: {
                gte: startOfWeek(new Date(), { weekStartsOn: 1 }),
                lt: endOfWeek(new Date(), { weekStartsOn: 1 }),
            },
            lugar: usarNotIn ? { notIn: lugares } : { in: lugares },
        },
        include: { Plato: true },
    });

    if (eventos.length === 0) {
        return NextResponse.json({ resultado: [] });
    }

    // 2. Recolectar todos los nombres de productos únicos
    const nombresProductos = new Set<string>();
    for (const evento of eventos) {
        for (const plato of evento.Plato) {
            nombresProductos.add(plato.nombre);
        }
    }

    // 3. Una sola consulta para obtener todas las recetas necesarias
    const todasLasRecetas = await prisma.receta.findMany({
        where: {
            nombreProducto: { in: Array.from(nombresProductos) },
            tipo: 'PT',
        },
        select: {
            nombreProducto: true,
            descripcion: true,
            porcionBruta: true,
            tipo: true,
            unidadMedida: true,
        },
    });

    // 4. Crear un mapa de recetas por producto para acceso O(1)
    const recetasPorProducto = new Map<string, Receta[]>();
    for (const receta of todasLasRecetas) {
        if (!recetasPorProducto.has(receta.nombreProducto)) {
            recetasPorProducto.set(receta.nombreProducto, []);
        }
        recetasPorProducto.get(receta.nombreProducto)!.push(receta);
    }

    // 5. Construir el grafo de dependencias completo
    const grafoRecetas = await construirGrafoCompleto(
        recetasPorProducto,
        nombresProductos
    );

    // 6. Procesar eventos sin consultas adicionales a la BD
    const mapResultado = new Map<
        string,
        { evento: Evento; cantidad: number; unidadMedida: string }[]
    >();

    for (const evento of eventos) {
        for (const plato of evento.Plato) {
            procesarPlatoIterativo(
                plato.nombre,
                plato.cantidad,
                evento,
                grafoRecetas,
                mapResultado
            );
        }
    }
    // Agrupar comandas por evento para evitar duplicados
    const resultado: Resultado[] = Array.from(mapResultado.entries()).map(
        ([semi, comandas]) => {
            const eventoMap = new Map<
                number,
                { evento: Evento; cantidad: number }
            >();
            for (const { evento, cantidad } of comandas) {
                if (eventoMap.has(evento.id)) {
                } else {
                    eventoMap.set(evento.id, { evento, cantidad });
                }
            }
            return {
                semi,
                comandas: Array.from(eventoMap.values()),
            };
        }
    );

    // const resultado: Resultado[] = Array.from(mapResultado.entries()).map(
    //     ([semi, comandas]) => ({ semi, comandas })
    // );

    return NextResponse.json(resultado);
}

// Construir el grafo completo de recetas una sola vez
async function construirGrafoCompleto(
    recetasPorProducto: Map<string, Receta[]>,
    nombresIniciales: Set<string>
): Promise<Map<string, Receta[]>> {
    const grafoCompleto = new Map<string, Receta[]>();
    const visitados = new Set<string>();
    const pendientes = Array.from(nombresIniciales);

    // Agregar recetas conocidas al grafo
    for (const [nombre, recetas] of recetasPorProducto) {
        grafoCompleto.set(nombre, recetas);
    }

    // Procesar pendientes para encontrar dependencias transitivas
    while (pendientes.length > 0) {
        const nombresPendientesBatch = pendientes.splice(0, 50); // Procesar en lotes
        const nombresNoVisitados = nombresPendientesBatch.filter(
            (nombre) => !visitados.has(nombre)
        );

        if (nombresNoVisitados.length === 0) continue;

        // Marcar como visitados
        nombresNoVisitados.forEach((nombre) => visitados.add(nombre));

        // Obtener recetas para este lote
        const nuevasRecetas = await prisma.receta.findMany({
            where: {
                nombreProducto: { in: nombresNoVisitados },
                tipo: 'PT',
            },
            select: {
                nombreProducto: true,
                descripcion: true,
                porcionBruta: true,
                tipo: true,
                unidadMedida: true,
            },
        });

        // Agregar al grafo y encontrar nuevas dependencias
        for (const receta of nuevasRecetas) {
            if (!grafoCompleto.has(receta.nombreProducto)) {
                grafoCompleto.set(receta.nombreProducto, []);
            }
            grafoCompleto.get(receta.nombreProducto)!.push(receta);

            // Agregar descripción a pendientes si no fue visitada
            if (!visitados.has(receta.descripcion)) {
                pendientes.push(receta.descripcion);
            }
        }
    }

    return grafoCompleto;
}

// Versión iterativa para evitar stack overflow y mejorar rendimiento
function procesarPlatoIterativo(
    nombreInicial: string,
    cantidadInicial: number,
    evento: Evento,
    grafoRecetas: Map<string, Receta[]>,
    mapResultado: Map<
        string,
        { evento: Evento; cantidad: number; unidadMedida: string | null }[]
    >
): void {
    // Usar una pila para simular la recursión
    const pila: Array<{ nombre: string; cantidad: number }> = [
        { nombre: nombreInicial, cantidad: cantidadInicial },
    ];

    while (pila.length > 0) {
        const { nombre, cantidad } = pila.pop()!;
        const recetas = grafoRecetas.get(nombre) || [];

        for (const receta of recetas) {
            const cantidadCalculo = cantidad * receta.porcionBruta;

            // Actualizar resultado
            if (mapResultado.has(receta.descripcion)) {
                mapResultado.get(receta.descripcion)!.push({
                    evento,
                    cantidad: cantidadCalculo,
                    unidadMedida: receta.unidadMedida,
                });
            } else {
                mapResultado.set(receta.descripcion, [
                    {
                        evento,
                        cantidad: cantidadCalculo,
                        unidadMedida: receta.unidadMedida,
                    },
                ]);
            }

            // Agregar a la pila para procesar recursivamente
            pila.push({
                nombre: receta.descripcion,
                cantidad: cantidadCalculo,
            });
        }
    }
}
