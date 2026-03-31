import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

type MetodoHttp = 'POST' | 'PUT';

interface MateriaPrimaInput {
    id: number;
    codigo: string;
    descripcion: string;
    unidadMedida: string;
    estado: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractPayloadData(body: unknown): Record<string, unknown> | null {
    if (!isRecord(body)) {
        return null;
    }

    if (isRecord(body.payload) && isRecord(body.payload.data)) {
        return body.payload.data;
    }

    if (isRecord(body.data)) {
        return body.data;
    }

    return body;
}

function readString(
    data: Record<string, unknown>,
    keys: string[],
): string | null {
    for (const key of keys) {
        const value = data[key];

        if (typeof value === 'string') {
            const normalizedValue = value.trim();
            if (normalizedValue) {
                return normalizedValue;
            }
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
            return String(value);
        }
    }

    return null;
}

function readId(data: Record<string, unknown>): number | null {
    const rawValue = data.id ?? data.id_mp;
    const idNumber =
        typeof rawValue === 'number' ? rawValue : Number(String(rawValue ?? ''));

    if (!Number.isInteger(idNumber) || idNumber <= 0) {
        return null;
    }

    return idNumber;
}

function normalizeEstado(data: Record<string, unknown>): string | null {
    const estado = readString(data, ['estado']);
    if (estado) {
        return estado;
    }

    const legacyEstado = readString(data, ['id_estado']);
    if (!legacyEstado) {
        return null;
    }

    if (legacyEstado === '1') {
        return 'Activo';
    }

    if (legacyEstado === '0') {
        return 'Inactivo';
    }

    return legacyEstado;
}

function parseMateriaPrimaInput(body: unknown): {
    data: MateriaPrimaInput | null;
    error: string | null;
} {
    const payloadData = extractPayloadData(body);

    if (!payloadData) {
        return {
            data: null,
            error: 'El body debe ser un objeto JSON válido',
        };
    }

    const id = readId(payloadData);
    const codigo = readString(payloadData, ['codigo', 'codigo_mprima']);
    const descripcion = readString(payloadData, ['descripcion']);
    const unidadMedida = readString(payloadData, [
        'unidadMedida',
        'unidad_medida',
        'um',
    ]);
    const estado = normalizeEstado(payloadData);

    if (id === null) {
        return {
            data: null,
            error: 'El id de la materia prima es inválido',
        };
    }

    if (!codigo || !descripcion || !unidadMedida || !estado) {
        return {
            data: null,
            error: 'Faltan datos obligatorios de la materia prima',
        };
    }

    return {
        data: {
            id,
            codigo,
            descripcion,
            unidadMedida,
            estado,
        },
        error: null,
    };
}

async function handleUpsertMateriaPrima(
    req: NextRequest,
    metodo: MetodoHttp,
) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    let rawBody: unknown = null;
    let materiaPrimaInput: MateriaPrimaInput | null = null;

    try {
        rawBody = await req.json();
    } catch (error) {
        await logAudit({
            modulo: 'sistema',
            accion: 'upsert_materia_prima',
            ruta: '/api/materiaPrima',
            metodo,
            estado: 'warning',
            resumen: 'JSON inválido en materia prima',
            detalle: {
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            {
                success: false,
                message: 'El body debe contener un JSON válido',
            },
            { status: 400 },
        );
    }

    const parsedInput = parseMateriaPrimaInput(rawBody);

    if (!parsedInput.data) {
        await logAudit({
            modulo: 'sistema',
            accion: 'upsert_materia_prima',
            ruta: '/api/materiaPrima',
            metodo,
            estado: 'warning',
            resumen: 'Payload inválido de materia prima',
            detalle: {
                body: rawBody,
                error: parsedInput.error,
            },
        });

        return NextResponse.json(
            {
                success: false,
                message: parsedInput.error,
            },
            { status: 400 },
        );
    }

    materiaPrimaInput = parsedInput.data;

    try {
        const existingMateriaPrima = await prisma.materiaPrima.findUnique({
            where: { id: materiaPrimaInput.id },
            select: { id: true },
        });

        const materiaPrima = await prisma.materiaPrima.upsert({
            where: { id: materiaPrimaInput.id },
            create: materiaPrimaInput,
            update: {
                codigo: materiaPrimaInput.codigo,
                descripcion: materiaPrimaInput.descripcion,
                unidadMedida: materiaPrimaInput.unidadMedida,
                estado: materiaPrimaInput.estado,
            },
        });

        const action = existingMateriaPrima ? 'updated' : 'created';

        await logAudit({
            modulo: 'sistema',
            accion: 'upsert_materia_prima',
            ruta: '/api/materiaPrima',
            metodo,
            resumen: `Materia prima ${materiaPrima.id} ${existingMateriaPrima ? 'actualizada' : 'creada'}`,
            detalle: {
                action,
                materiaPrima,
            },
        });

        return NextResponse.json(
            {
                success: true,
                action,
                materiaPrima,
            },
            { status: existingMateriaPrima ? 200 : 201 },
        );
    } catch (error) {
        await logAudit({
            modulo: 'sistema',
            accion: 'upsert_materia_prima',
            ruta: '/api/materiaPrima',
            metodo,
            estado: 'error',
            resumen: 'Error persistiendo materia prima',
            detalle: {
                body: rawBody,
                materiaPrimaInput,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            {
                success: false,
                message: 'Error al guardar la materia prima',
            },
            { status: 500 },
        );
    }
}

export async function POST(req: NextRequest) {
    return handleUpsertMateriaPrima(req, 'POST');
}

export async function PUT(req: NextRequest) {
    return handleUpsertMateriaPrima(req, 'PUT');
}
