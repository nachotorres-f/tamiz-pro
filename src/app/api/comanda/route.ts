// app/api/external-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

const API_KEY = process.env.API_KEY;

function normalizarClaveNombre(valor: string): string {
    return valor.trim().toLocaleLowerCase('es');
}

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== API_KEY) {
        await logAudit({
            modulo: 'comandas',
            accion: 'ingresar_comanda',
            ruta: '/api/comanda',
            metodo: 'POST',
            estado: 'error',
            resumen: 'Unauthorized',
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any;

    try {
        body = await req.json();

        body.Id = Number(body.Id);

        // Decodifica MomnetoId y MomnetoComidaId en un solo paso
        Object.keys(body).forEach((key) => {
            const value = body[key];
            if (key.includes('MomnetoId')) {
                try {
                    const firstParse = JSON.parse(value);
                    Object.keys(firstParse).forEach((k) => {
                        if (k.includes('MomnetoComidaId')) {
                            try {
                                firstParse[k] = JSON.parse(firstParse[k]);
                            } catch {}
                        }
                    });
                    body[key] = firstParse;
                } catch {
                    body[key] = value;
                }
            }
        });

        // Extrae horaInicio y horaFin de forma más robusta
        const [, horaInicio, horaFin] =
            body.Inicio.match(/: ([^a]+) a ([^]+)$/) || [];
        const ahora = new Date();
        const [hIni, mIni] = (horaInicio || '00:00').split(':').map(Number);
        const [hFin, mFin] = (horaFin || '00:00').split(':').map(Number);

        const horarioInicio = new Date(
            Date.UTC(
                ahora.getFullYear(),
                ahora.getMonth(),
                ahora.getDate(),
                hIni,
                mIni,
            ),
        );
        const horarioFin = new Date(
            Date.UTC(
                ahora.getFullYear(),
                ahora.getMonth(),
                ahora.getDate(),
                hFin,
                mFin,
            ),
        );

        const comandaExiste = await prisma.comanda.findFirst({
            where: { id: body.Id },
        });

        if (comandaExiste) {
            await prisma.plato.deleteMany({ where: { comandaId: body.Id } });
            await prisma.comanda.delete({ where: { id: body.Id } });
        }

        await prisma.comanda.create({
            data: {
                id: body.Id,
                lugar: body.Lugar,
                salon: body.Espacio,
                tipo: body.Experiencia,
                fecha: new Date(body.Fecha),
                nombre: body.Cliente,
                horarioInicio,
                horarioFin,
                observaciones: body.Observaciones || '',
                cantidadMayores: Number(body.CantMayores) || 0,
                cantidadMenores: Number(body.CantMenores) || 0,
            },
        });

        // const tiposOmitir = [
        //     'Vajilla',
        //     'Manteleria',
        //     'Barra',
        //     'Bebida',
        //     'Cervezas',
        //     'Fernet',
        //     'Champagne',
        //     'Vino',
        //     'Cafe',
        //     'Maridaje',
        // ];

        // Prepara los platos a upsert en batch
        const platosBase: {
            nombre: string;
            cantidad: number;
            comandaId: number;
        }[] = [];

        Object.keys(body).forEach((key) => {
            if (key.includes('MomnetoId')) {
                Object.values(body[key]).forEach((item) => {
                    const platoItem = item as {
                        ComidaFamilia?: string;
                        ComidaDescripcion?: string;
                        ComidaTotal?: number | string;
                    };
                    // Only persist items with a valid description and numeric quantity
                    const descripcion =
                        typeof platoItem.ComidaDescripcion === 'string'
                            ? platoItem.ComidaDescripcion.trim()
                            : '';
                    const cantidad = Number(platoItem.ComidaTotal);

                    if (descripcion && Number.isFinite(cantidad)) {
                        platosBase.push({
                            nombre: descripcion,
                            cantidad,
                            comandaId: body.Id,
                        });
                    }
                });
            }
        });

        const nombresUnicos = Array.from(
            new Set(platosBase.map((plato) => plato.nombre)),
        );

        const recetas = await prisma.receta.findMany({
            where: {
                nombreProducto: {
                    in: nombresUnicos,
                },
            },
            select: {
                codigo: true,
                nombreProducto: true,
            },
            orderBy: {
                id: 'asc',
            },
        });

        const codigoPorNombre = new Map<string, string>();
        for (const receta of recetas) {
            const claveNombre = normalizarClaveNombre(receta.nombreProducto);
            if (!codigoPorNombre.has(claveNombre)) {
                codigoPorNombre.set(claveNombre, receta.codigo);
            }
        }

        const platos = platosBase.map((plato) => ({
            ...plato,
            codigo:
                codigoPorNombre.get(normalizarClaveNombre(plato.nombre)) ?? '',
        }));

        // Busca platos existentes en una sola consulta
        // Actualiza o crea platos en paralelo
        // await Promise.all(
        //     platos.map(async (plato) => {
        //         await prisma.plato.create({ data: plato });
        //     })
        // );

        await prisma.plato.createMany({
            data: platos,
        });

        const platosSinCodigo = platos.filter(
            (plato) => String(plato.codigo || '').trim() === '',
        );

        await logAudit({
            modulo: 'comandas',
            accion: 'ingresar_comanda',
            ruta: '/api/comanda',
            metodo: 'POST',
            estado: platosSinCodigo.length > 0 ? 'warning' : 'success',
            resumen: `Comanda ${body.Id} procesada`,
            detalle: {
                comandaId: body.Id,
                lugar: body.Lugar,
                salon: body.Espacio,
                platosRecibidos: platos.length,
                platosConCodigo: platos.length - platosSinCodigo.length,
                platosSinCodigo: platosSinCodigo.map((plato) => plato.nombre),
            },
        });

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        await logAudit({
            modulo: 'comandas',
            accion: 'ingresar_comanda',
            ruta: '/api/comanda',
            metodo: 'POST',
            estado: 'error',
            resumen: `Error procesando comanda ${body?.Id ?? 'sin_id'}`,
            detalle: {
                comandaId: body?.Id,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al procesar la comanda' },
            { status: 500 },
        );
    }
}

export async function DELETE(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== API_KEY) {
        await logAudit({
            modulo: 'comandas',
            accion: 'eliminar_comanda',
            ruta: '/api/comanda',
            metodo: 'DELETE',
            estado: 'error',
            resumen: 'Unauthorized',
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let id = 0;
    try {
        const body = await req.json();
        id = Number(body.Id);

        // Elimina la comanda y sus platos asociados
        await prisma.plato.deleteMany({
            where: { comandaId: id },
        });

        await prisma.comanda.delete({
            where: { id },
        });

        await logAudit({
            modulo: 'comandas',
            accion: 'eliminar_comanda',
            ruta: '/api/comanda',
            metodo: 'DELETE',
            resumen: `Comanda ${id} eliminada`,
            detalle: { comandaId: id },
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        await logAudit({
            modulo: 'comandas',
            accion: 'eliminar_comanda',
            ruta: '/api/comanda',
            metodo: 'DELETE',
            estado: 'error',
            resumen: `Error eliminando comanda ${id || 'sin_id'}`,
            detalle: {
                comandaId: id || null,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al eliminar la comanda' },
            { status: 500 },
        );
    }
}
