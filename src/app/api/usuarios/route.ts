import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { requirePageKeyAccess } from '@/lib/page-guard';
import {
    PAGE_ACCESS_CATALOG,
    getDefaultPageAccessByRole,
    getEffectiveAllowedPageKeys,
    normalizeAllowedPageKeys,
} from '@/lib/page-access';

function sanitizeAllowedPageKeys(allowedPageKeys: string[] | undefined, rol: string) {
    const validPageKeys = new Set(PAGE_ACCESS_CATALOG.map((page) => page.key));

    if (allowedPageKeys === undefined) {
        return getDefaultPageAccessByRole(rol);
    }

    const hasInvalidPageKey = allowedPageKeys.some(
        (pageKey) => !validPageKeys.has(pageKey),
    );

    if (hasInvalidPageKey) {
        return null;
    }

    return normalizeAllowedPageKeys(allowedPageKeys);
}

function mapUserWithAccess<
    T extends {
        pageAccessConfigured?: boolean;
        pageAccess?: Array<{ pageKey: string }> | undefined;
    },
>(
    user: T & { id: number; username: string; salon: string; rol: string },
) {
    return {
        id: user.id,
        username: user.username,
        salon: user.salon,
        rol: user.rol,
        allowedPageKeys: getEffectiveAllowedPageKeys({
            rol: user.rol,
            pageAccessConfigured: user.pageAccessConfigured,
            pageAccess: user.pageAccess,
        }),
    };
}

export async function GET(req: NextRequest) {
    const userRequest = await requirePageKeyAccess(req, 'usuarios');
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));

    if (userRequest instanceof NextResponse) {
        return userRequest;
    }

    if (!id) {
        const where =
            userRequest.rol === 'admin'
                ? undefined
                : {
                      id: userRequest.id,
                  };

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                username: true,
                salon: true,
                rol: true,
                pageAccessConfigured: true,
                pageAccess: {
                    select: {
                        pageKey: true,
                    },
                },
            },
        });

        return NextResponse.json({
            users: users.map(mapUserWithAccess),
            userRequest,
        });
    }

    if (userRequest.rol !== 'admin' && id !== userRequest.id) {
        return NextResponse.json(
            { success: false, message: 'Forbidden' },
            { status: 403 }
        );
    }

    const user = await prisma.user.findUnique({
        select: {
            id: true,
            username: true,
            salon: true,
            rol: true,
            pageAccessConfigured: true,
            pageAccess: {
                select: {
                    pageKey: true,
                },
            },
        },
        where: {
            id,
        },
    });

    return NextResponse.json({
        user: user ? mapUserWithAccess(user) : null,
        userRequest,
    });
}

interface BodyPost {
    username: string;
    password: string;
    salon: string;
    rol: string;
    allowedPageKeys?: string[];
}

export async function POST(req: NextRequest) {
    const userRequest = await requirePageKeyAccess(req, 'usuarios');

    if (userRequest instanceof NextResponse || userRequest.rol !== 'admin') {
        return NextResponse.json(
            { success: false, message: 'Forbidden' },
            { status: 403 }
        );
    }

    const { username, password, salon, rol, allowedPageKeys }: BodyPost =
        await req.json();
    const sanitizedAllowedPageKeys = sanitizeAllowedPageKeys(
        allowedPageKeys,
        rol,
    );

    if (!username || !password || !salon || !rol) {
        return NextResponse.json(
            { success: false, message: 'Datos incompletos' },
            { status: 400 }
        );
    }

    if (!sanitizedAllowedPageKeys) {
        return NextResponse.json(
            { success: false, message: 'Permisos inválidos' },
            { status: 400 }
        );
    }

    const exist = await prisma.user.findUnique({ where: { username } });

    if (exist) {
        return NextResponse.json(
            { success: false, message: 'Usuario ya existe' },
            { status: 409 }
        );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
        data: {
            username,
            password: hashedPassword,
            salon,
            rol,
            pageAccessConfigured: true,
            ...(sanitizedAllowedPageKeys.length > 0
                ? {
                      pageAccess: {
                          create: sanitizedAllowedPageKeys.map((pageKey) => ({
                              pageKey,
                          })),
                      },
                  }
                : {}),
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
    allowedPageKeys?: string[];
}

interface Update {
    username?: string;
    password?: string;
    salon?: string;
    rol?: string;
}

export async function PUT(req: NextRequest) {
    const userRequest = await requirePageKeyAccess(req, 'usuarios');
    const {
        id,
        username,
        currentPassword,
        newPassword,
        salon,
        rol,
        allowedPageKeys,
    }: BodyPut = await req.json();

    if (!id) {
        return NextResponse.json(
            { success: false, message: 'Id de usuario inválido' },
            { status: 400 }
        );
    }

    const user = await prisma.user.findUnique({
        where: { id },
    });

    if (!user) {
        return NextResponse.json(
            { success: false, message: 'No se encontro el usuario' },
            { status: 404 }
        );
    }

    if (userRequest instanceof NextResponse) {
        return userRequest;
    }

    const dataToUpdate: Update = {};
    const isSelf = userRequest.id === id;
    const isAdmin = userRequest.rol === 'admin';

    if (!isAdmin && !isSelf) {
        return NextResponse.json(
            { success: false, message: 'Forbidden' },
            { status: 403 }
        );
    }

    if (!isAdmin && (username || salon || rol || allowedPageKeys)) {
        return NextResponse.json(
            { success: false, message: 'Forbidden' },
            { status: 403 }
        );
    }

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

    const nextRole = rol || user.rol;
    const nextAllowedPageKeys = isAdmin
        ? sanitizeAllowedPageKeys(allowedPageKeys, nextRole)
        : undefined;

    if (isAdmin && !nextAllowedPageKeys) {
        return NextResponse.json(
            { success: false, message: 'Permisos inválidos' },
            { status: 400 }
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id },
            data: {
                ...dataToUpdate,
                ...(isAdmin ? { pageAccessConfigured: true } : {}),
            },
        });

        if (isAdmin && nextAllowedPageKeys) {
            await tx.userPageAccess.deleteMany({
                where: { userId: id },
            });

            if (nextAllowedPageKeys.length > 0) {
                await tx.userPageAccess.createMany({
                    data: nextAllowedPageKeys.map((pageKey) => ({
                        userId: id,
                        pageKey,
                    })),
                });
            }
        }
    });

    return NextResponse.json(
        { success: true, message: 'Usuario actualizado' },
        { status: 200 }
    );
}

export async function DELETE(req: NextRequest) {
    const userRequest = await requirePageKeyAccess(req, 'usuarios');
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));

    if (userRequest instanceof NextResponse || userRequest.rol !== 'admin') {
        return NextResponse.json(
            { success: false, message: 'Forbidden' },
            { status: 403 }
        );
    }

    if (!id) {
        return NextResponse.json(
            { success: false, message: 'Id de usuario inválido' },
            { status: 400 }
        );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json(
        { success: true, message: 'Usuario eliminado' },
        { status: 200 }
    );
}
