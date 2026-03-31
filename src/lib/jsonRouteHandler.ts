import { NextRequest, NextResponse } from 'next/server';

interface JsonPayloadAnalysis {
    tipo: 'array' | 'object' | 'primitive' | 'null';
    cantidadItems?: number;
    claves?: string[];
}

interface JsonRouteHandlerOptions {
    metodo: 'POST' | 'PUT';
    ruta: string;
}

function analyzeJsonPayload(payload: unknown): JsonPayloadAnalysis {
    if (payload === null) {
        return {
            tipo: 'null',
        };
    }

    if (Array.isArray(payload)) {
        return {
            tipo: 'array',
            cantidadItems: payload.length,
        };
    }

    if (typeof payload === 'object') {
        return {
            tipo: 'object',
            claves: Object.keys(payload),
        };
    }

    return {
        tipo: 'primitive',
    };
}

export async function handleJsonConsoleRoute(
    req: NextRequest,
    { metodo, ruta }: JsonRouteHandlerOptions,
) {
    try {
        const payload: unknown = await req.json();
        const analisis = analyzeJsonPayload(payload);

        console.log(`[${metodo}] ${ruta} JSON recibido`, {
            analisis,
            payload,
        });

        return NextResponse.json({
            success: true,
            message: 'JSON recibido correctamente',
            analisis,
        });
    } catch (error) {
        console.error(`[${metodo}] ${ruta} error procesando JSON`, error);

        return NextResponse.json(
            {
                success: false,
                message: 'El body debe contener un JSON válido',
            },
            { status: 400 },
        );
    }
}
