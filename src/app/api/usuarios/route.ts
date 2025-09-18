import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));

    const userRequest = await getUserFromRequest(req);

    if (!id) {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, salon: true, rol: true },
        });
        return NextResponse.json({ users, userRequest: userRequest });
    }

    const user = await prisma.user.findUnique({
        select: { id: true, username: true, salon: true, rol: true },
        where: {
            id,
        },
    });

    return NextResponse.json({ user, userRequest: userRequest?.id });
}

interface BodyPost {
    username: string;
    password: string;
    salon: string;
    rol: string;
}

export async function POST(req: NextRequest) {
    const { username, password, salon, rol }: BodyPost = await req.json();

    const exist = await prisma.user.findUnique({ where: { username } });

    if (exist) {
        return NextResponse.json(
            { success: false, message: 'Usuario ya existe' },
            { status: 401 }
        );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
        data: {
            username,
            password: hashedPassword,
            salon,
            rol,
        },
    });

    return NextResponse.json(
        { success: true, message: 'Usuario creado' },
        { status: 200 }
    );
}

interface BodyPut {
    id: number;
    username: string;
    currentPassword: string;
    newPassword: string;
    salon: string;
    rol: string;
}

interface Update {
    username?: string;
    password?: string;
    salon?: string;
    rol?: string;
}

export async function PUT(req: NextRequest) {
    const { id, username, currentPassword, newPassword, salon, rol }: BodyPut =
        await req.json();

    const user = await prisma.user.findUnique({
        where: { id },
    });

    if (!user) {
        return NextResponse.json(
            { success: false, message: 'No se encontro el usuario' },
            { status: 200 }
        );
    }

    const dataToUpdate: Update = {};

    if (username) dataToUpdate.username = username;
    if (salon) dataToUpdate.salon = salon;
    if (rol) dataToUpdate.rol = rol;
    if (newPassword) {
        const okPassword = await bcrypt.compare(currentPassword, user.password);

        if (okPassword) {
            dataToUpdate.password = await bcrypt.hash(newPassword, 10);
        } else {
            return NextResponse.json(
                {
                    success: false,
                    message: 'La contraseña es incorrecta',
                },
                { status: 400 }
            );
        }
    }

    await prisma.user.update({
        where: { id },
        data: dataToUpdate,
    });

    return NextResponse.json(
        { success: true, message: 'Usuario actualizado' },
        { status: 200 }
    );
}

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));

    await prisma.user.delete({ where: { id } });

    return NextResponse.json(
        { success: false, message: 'Usuario eliminado' },
        { status: 200 }
    );
}
