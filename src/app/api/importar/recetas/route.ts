import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            throw new Error('No se proporcionó ningún archivo');
        }

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);

        // Elimino el encabezado
        json.shift();

        // Generamos la lista de propiedades esperadas
        const propiedadesRequeridas = Array.from({ length: 10 }, (_, i) =>
            i === 0 ? '__EMPTY' : `__EMPTY_${i}`
        );

        // Normalizamos los datos para que tengan todas las propiedades
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = json.map((item: any) => {
            const objetoBase = Object.fromEntries(
                propiedadesRequeridas.map((prop) => [prop, item[prop] ?? ''])
            );

            if (item['Maestro de Recetas'] !== undefined) {
                objetoBase['Maestro de Recetas'] = item['Maestro de Recetas'];
            }

            return objetoBase;
        });

        // Eliminar todas las recetas existentes
        await prisma.receta.deleteMany();

        // Insertar los nuevos datos en la tabla recetas
        await prisma.receta.createMany({
            data: data.map((item) => ({
                codigo: item['Maestro de Recetas'],
                nombreProducto: item['__EMPTY'],
                proceso: item['__EMPTY_1'],
                tipo: item['__EMPTY_2'],
                subCodigo: item['__EMPTY_3'],
                descripcion: item['__EMPTY_4'],
                unidadMedida: item['__EMPTY_5'],
                porcionBruta: item['__EMPTY_6'],
                porcionNeta: item['__EMPTY_7'],
                MO: item['__EMPTY_8'],
                dueno: item['__EMPTY_9'],
            })),
        });

        return NextResponse.json({
            success: true,
            message: 'Recetas importadas correctamente',
            data,
        });
    } catch {
        return NextResponse.json(
            { success: false, message: 'Error al leer el archivo' },
            { status: 500 }
        );
    }
}
