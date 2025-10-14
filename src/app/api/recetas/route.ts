import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    try {
        const response = await fetch(
            'https://www.sistemagauri.com.ar/sistema/sistemas/servicios/maestrorecetas.php',
            {
                method: 'GET', // o 'POST' si el servicio lo requiere
                headers: {
                    'api-key': 'a7e0f120a2753b76d4b2fe5fa0f4dd90',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }

        type RecetaItem = {
            receta_codigo: string;
            receta_nombre: string;
            proceso: string;
            tipo: string;
            codigo: string;
            descripcion: string;
            um: string;
            cant_bruta: string | number;
            cant_neta: string | number;
            tiempo: string | number;
            dueno: string;
        };

        const data: RecetaItem[] = await response.json(); // o response.json() si devuelve JSON

        await prisma.$transaction(
            async (tx) => {
                await tx.receta.deleteMany();
                await tx.receta.createMany({
                    data: data.map((item: RecetaItem) => ({
                        codigo: item.receta_codigo,
                        nombreProducto: item.receta_nombre,
                        proceso: item.proceso,
                        tipo: item.tipo,
                        subCodigo: item.codigo,
                        descripcion: item.descripcion,
                        unidadMedida: item.um,
                        porcionBruta: Number(item.cant_bruta),
                        porcionNeta: Number(item.cant_neta),
                        MO: Number(item.tiempo),
                        dueno: item.dueno,
                    })),
                });
            },
            { timeout: 60000 }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error) {
            console.error('Error al consultar el servicio:', error.message);
        } else {
            console.error('Error al consultar el servicio:', error);
        }

        return NextResponse.json(
            { error: 'Error al consultar el servicio externo' },
            { status: 500 }
        );
    }
}
