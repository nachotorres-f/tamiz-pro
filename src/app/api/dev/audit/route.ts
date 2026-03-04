import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

function isAuditApiEnabled(): boolean {
    return process.env.DEV_AUDIT_ENABLED === 'true';
}

function secureEqual(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);
    if (aBuffer.length !== bBuffer.length) {
        return false;
    }
    return timingSafeEqual(aBuffer, bBuffer);
}

function extractToken(req: NextRequest): string {
    const tokenHeader = req.headers.get('x-dev-token') || '';
    if (tokenHeader) {
        return tokenHeader;
    }

    const authHeader = req.headers.get('authorization') || '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
        return authHeader.slice(7).trim();
    }

    return '';
}

function isAuthorized(req: NextRequest): boolean {
    if (!isAuditApiEnabled()) {
        return false;
    }

    const expected = process.env.DEV_AUDIT_TOKEN || '';
    const received = extractToken(req);

    if (!expected || !received) {
        return false;
    }

    return secureEqual(received, expected);
}

function formatLine(item: {
    id: number;
    createdAt: Date;
    modulo: string;
    accion: string;
    metodo: string;
    ruta: string;
    estado: string;
    resumen: string | null;
    detalle: string | null;
}) {
    return [
        `[${item.createdAt.toISOString()}] #${item.id}`,
        `modulo=${item.modulo}`,
        `accion=${item.accion}`,
        `metodo=${item.metodo}`,
        `ruta=${item.ruta}`,
        `estado=${item.estado}`,
        `resumen=${item.resumen || ''}`,
        `detalle=${item.detalle || ''}`,
    ].join(' | ');
}

export async function GET(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const modulo = req.nextUrl.searchParams.get('modulo') || undefined;
    const desde = req.nextUrl.searchParams.get('desde') || undefined;
    const hasta = req.nextUrl.searchParams.get('hasta') || undefined;
    const formato = req.nextUrl.searchParams.get('formato') || 'json';
    const limit = Math.min(
        Number(req.nextUrl.searchParams.get('limit') || 500),
        5000,
    );

    const logs = await prisma.auditLog.findMany({
        where: {
            ...(modulo ? { modulo } : {}),
            ...(desde || hasta
                ? {
                      createdAt: {
                          ...(desde ? { gte: new Date(desde) } : {}),
                          ...(hasta ? { lte: new Date(hasta) } : {}),
                      },
                  }
                : {}),
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: limit,
    });

    if (formato === 'txt') {
        const body = logs.map(formatLine).join('\n');

        return new NextResponse(body, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': `attachment; filename="audit_${modulo || 'all'}.txt"`,
            },
        });
    }

    return NextResponse.json({ count: logs.length, logs });
}

export async function DELETE(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const modulo = typeof body?.modulo === 'string' ? body.modulo : undefined;
    const hasta = typeof body?.hasta === 'string' ? body.hasta : undefined;

    const deleted = await prisma.auditLog.deleteMany({
        where: {
            ...(modulo ? { modulo } : {}),
            ...(hasta ? { createdAt: { lte: new Date(hasta) } } : {}),
        },
    });

    await logAudit({
        modulo: 'sistema',
        accion: 'delete_audit_logs',
        ruta: '/api/dev/audit',
        metodo: 'DELETE',
        estado: 'warning',
        resumen: 'Borrado manual de auditoría',
        detalle: {
            filtro: { modulo, hasta },
            deleted: deleted.count,
        },
    });

    return NextResponse.json({ ok: true, deleted: deleted.count });
}
