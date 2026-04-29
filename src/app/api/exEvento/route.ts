import { logAudit } from '@/lib/audit';
import { requirePageKeyAccess } from '@/lib/page-guard';
import { prisma } from '@/lib/prisma';
import {
    obtenerResumenesExpedicionPlatos,
    resolverCodigoExpedicionPlato,
    type ExpedicionPlatoResumen,
} from '@/server/expedicion/receta';
import { NextRequest, NextResponse } from 'next/server';

interface Body {
    comandaId: number;
    platoId?: number;
    codigo: string;
    subCodigo: string;
}

const normalizarTexto = (valor: string | null | undefined) =>
    String(valor ?? '').trim();

export async function GET(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';
    const accessResult = await requirePageKeyAccess(req, 'expedicion');

    if (accessResult instanceof NextResponse) {
        return accessResult;
    }

    const { searchParams } = req.nextUrl;
    const id = Number(searchParams.get('id'));

    if (!Number.isFinite(id) || id <= 0) {
        return NextResponse.json(
            { error: 'Comanda inválida' },
            { status: 400 },
        );
    }

    try {
        const evento = await prisma.comanda.findFirst({
            where: {
                id,
            },
            include: {
                Plato: {
                    orderBy: {
                        id: 'asc',
                    },
                },
            },
        });

        if (!evento) {
            return NextResponse.json(
                { error: 'Comanda no encontrada' },
                { status: 404 },
            );
        }

        const platos = await obtenerResumenesExpedicionPlatos(
            evento.id,
            evento.Plato.map((plato) => ({
                id: plato.id,
                codigo: plato.codigo,
                nombre: plato.nombre,
                cantidad: plato.cantidad,
            })),
        );

        await logAudit({
            modulo: 'expedicion',
            accion: 'consultar_expedicion_evento',
            ruta: '/api/exEvento',
            metodo: 'GET',
            resumen: `Consulta de expedición para comanda ${id}`,
            detalle: {
                comandaId: id,
                platos: platos.length,
            },
        });

        return NextResponse.json({
            comanda: {
                id: evento.id,
                nombre: evento.nombre,
                lugar: evento.lugar,
                salon: evento.salon,
                fecha: evento.fecha,
                cantidadInvitados:
                    evento.cantidadMayores + evento.cantidadMenores,
            },
            platos,
        });
    } catch (error) {
        await logAudit({
            modulo: 'expedicion',
            accion: 'consultar_expedicion_evento',
            ruta: '/api/exEvento',
            metodo: 'GET',
            estado: 'error',
            resumen: 'Error consultando expedición por evento',
            detalle: {
                comandaId: id,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al consultar expedición' },
            { status: 500 },
        );
    }
}

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';
    const accessResult = await requirePageKeyAccess(req, 'expedicion');

    if (accessResult instanceof NextResponse) {
        return accessResult;
    }

    let body: Body | null = null;

    try {
        const payload = (await req.json()) as Body;
        body = payload;
        const comandaId = Number(payload.comandaId);
        const platoId = Number(payload.platoId);
        const codigo = normalizarTexto(payload.codigo);
        const subCodigo = normalizarTexto(payload.subCodigo);

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

        const resumenPlato = await obtenerResumenPlatoDesdePayload(
            comandaId,
            platoId,
            codigo,
        );

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

        return NextResponse.json(
            {
                success: true,
                resumenPlato,
            },
            { status: 201 },
        );
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
    const accessResult = await requirePageKeyAccess(req, 'expedicion');

    if (accessResult instanceof NextResponse) {
        return accessResult;
    }

    let body: Body | null = null;

    try {
        const payload = (await req.json()) as Body;
        body = payload;
        const comandaId = Number(payload.comandaId);
        const platoId = Number(payload.platoId);
        const codigo = normalizarTexto(payload.codigo);
        const subCodigo = normalizarTexto(payload.subCodigo);

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

        const resumenPlato = await obtenerResumenPlatoDesdePayload(
            comandaId,
            platoId,
            codigo,
        );

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

        return NextResponse.json(
            {
                success: true,
                resumenPlato,
            },
            { status: 201 },
        );
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

async function obtenerResumenPlatoDesdePayload(
    comandaId: number,
    platoId: number,
    platoCodigo: string,
): Promise<ExpedicionPlatoResumen | null> {
    if (!comandaId || (!platoId && !platoCodigo)) {
        return null;
    }

    const plato = await prisma.plato.findFirst({
        where: {
            comandaId,
            ...(platoId
                ? { id: platoId }
                : {
                      codigo: platoCodigo,
                  }),
        },
        orderBy: {
            id: 'asc',
        },
    });

    if (!plato) {
        return null;
    }

    const [resumen] = await obtenerResumenesExpedicionPlatos(
        comandaId,
        [
            {
                id: plato.id,
                codigo:
                    plato.codigo ||
                    resolverCodigoExpedicionPlato(plato.id, plato.codigo),
                nombre: plato.nombre,
                cantidad: plato.cantidad,
            },
        ],
    );

    return resumen ?? null;
}
