import { handleJsonConsoleRoute } from '@/lib/jsonRouteHandler';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
    return handleJsonConsoleRoute(req, {
        metodo: 'POST',
        ruta: '/api/materiaPrima',
    });
}

export async function PUT(req: NextRequest) {
    return handleJsonConsoleRoute(req, {
        metodo: 'PUT',
        ruta: '/api/materiaPrima',
    });
}
