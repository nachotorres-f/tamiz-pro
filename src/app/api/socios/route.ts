import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.API_KEY;

export async function POST(req: NextRequest) {
    const apiKey = req.headers.get('x-api-key');

    if (!apiKey || apiKey !== API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    console.log(body);

    return NextResponse.json({ success: true });
}
