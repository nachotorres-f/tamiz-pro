// app/api/external-data/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.API_KEY;

export async function POST(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(req);
    console.log(req.body);

    // Aquí podés usar Prisma para guardar la info en tu base de datos
    // await prisma.order.create({ data: { ... } })

    return NextResponse.json({ success: true }, { status: 201 });
}
