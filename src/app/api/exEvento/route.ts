import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';

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

    try {
        const evento = await prisma.comanda.findFirst({
            where: {
                id: id ? Number(id) : undefined,
            },
            include: {
                Plato: true,
            },
        });

        const platos = await Promise.all(
            evento?.Plato.map(async ({ codigo, nombre, cantidad }) => {
                const codigoNormalizado = (codigo ?? '').trim();
                const recetas = await prisma.receta.findMany({
                    where: {
                        ...(codigoNormalizado
                            ? { codigo: codigoNormalizado }
                            : { nombreProducto: nombre }),
                    },
                });

                if (recetas.length === 0) {
                    return [
                        {
                            codigo: codigoNormalizado,
                            subCodigo: '',
                            nombreProducto: nombre,
                            descripcion: nombre,
                            tipo: 'SIN_RECETA',
                            unidadMedida: '',
                            porcionBruta: cantidad,
                            check: false,
                            cantidadPadre: cantidad,
                            puedeExpedir: false,
                        },
                    ];
                }

                return await Promise.all(
                    recetas.map(
                        async ({ codigo, subCodigo, porcionBruta, ...receta }) => {
                            const checkExpedicion =
                                await prisma.expedicion.findFirst({
                                    select: { id: true },
                                    where: {
                                        comandaId: Number(id),
                                        codigo,
                                        subCodigo,
                                    },
                                });

                            return {
                                codigo,
                                subCodigo,
                                ...receta,
                                porcionBruta: porcionBruta * cantidad,
                                check: !!checkExpedicion,
                                cantidadPadre: cantidad,
                                puedeExpedir: Boolean(codigo && subCodigo),
                            };
                        },
                    ),
                );
            }) ?? [],
        );

        await logAudit({
            modulo: 'expedicion',
            accion: 'consultar_expedicion_evento',
            ruta: '/api/exEvento',
            metodo: 'GET',
            resumen: `Consulta de expedición para comanda ${id || 'sin_id'}`,
            detalle: {
                comandaId: id ? Number(id) : null,
                platos: platos.length,
            },
        });

        return NextResponse.json(platos);
    } catch (error) {
        await logAudit({
            modulo: 'expedicion',
            accion: 'consultar_expedicion_evento',
            ruta: '/api/exEvento',
            metodo: 'GET',
            estado: 'error',
            resumen: 'Error consultando expedición por evento',
            detalle: {
                comandaId: id ? Number(id) : null,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al consultar expedición' },
            { status: 500 },
        );
    }
}

interface Body {
    comandaId: number;
    codigo: string;
    subCodigo: string;
}

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';
    let body: Body | null = null;

    try {
        const payload = (await req.json()) as Body;
        body = payload;
        const { comandaId, codigo, subCodigo } = payload;

        if (!comandaId || !codigo || !subCodigo) {
            await logAudit({
                modulo: 'expedicion',
                accion: 'marcar_expedicion',
                ruta: '/api/exEvento',
                metodo: 'POST',
                estado: 'warning',
                resumen: 'Datos incompletos para marcar expedición',
                detalle: payload,
            });

            return NextResponse.json({
                json: 400,
                message: 'Faltan datos para marcar la expedicion',
            });
        }

        const exist = await prisma.expedicion.findFirst({
            where: {
                comandaId,
                codigo,
                subCodigo,
            },
        });

        if (!exist) {
            await prisma.expedicion.create({
                data: {
                    comandaId,
                    codigo,
                    subCodigo,
                },
            });
        }

        await logAudit({
            modulo: 'expedicion',
            accion: 'marcar_expedicion',
            ruta: '/api/exEvento',
            metodo: 'POST',
            resumen: `Item marcado en expedición para comanda ${comandaId}`,
            detalle: {
                comandaId,
                codigo,
                subCodigo,
                yaExistia: Boolean(exist),
            },
        });

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        await logAudit({
            modulo: 'expedicion',
            accion: 'marcar_expedicion',
            ruta: '/api/exEvento',
            metodo: 'POST',
            estado: 'error',
            resumen: 'Error marcando expedición',
            detalle: {
                body,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al marcar expedición' },
            { status: 500 },
        );
    }
}

export async function DELETE(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';
    let body: Body | null = null;

    try {
        const payload = (await req.json()) as Body;
        body = payload;
        const { comandaId, codigo, subCodigo } = payload;

        if (!comandaId || !codigo || !subCodigo) {
            await logAudit({
                modulo: 'expedicion',
                accion: 'desmarcar_expedicion',
                ruta: '/api/exEvento',
                metodo: 'DELETE',
                estado: 'warning',
                resumen: 'Datos incompletos para borrar expedición',
                detalle: payload,
            });

            return NextResponse.json({
                json: 400,
                message: 'Faltan datos para borrar la expedicion',
            });
        }

        const deleted = await prisma.expedicion.deleteMany({
            where: {
                comandaId,
                codigo,
                subCodigo,
            },
        });

        await logAudit({
            modulo: 'expedicion',
            accion: 'desmarcar_expedicion',
            ruta: '/api/exEvento',
            metodo: 'DELETE',
            resumen: `Item desmarcado en expedición para comanda ${comandaId}`,
            detalle: {
                comandaId,
                codigo,
                subCodigo,
                eliminados: deleted.count,
            },
        });

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        await logAudit({
            modulo: 'expedicion',
            accion: 'desmarcar_expedicion',
            ruta: '/api/exEvento',
            metodo: 'DELETE',
            estado: 'error',
            resumen: 'Error desmarcando expedición',
            detalle: {
                body,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al borrar expedición' },
            { status: 500 },
        );
    }
}
