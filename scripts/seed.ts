import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        // log: ['query'],
    });

import bcrypt from 'bcrypt';

async function main() {
    const hashedPassword = await bcrypt.hash('mago', 10);

    await prisma.user.create({
        data: {
            username: 'mago',
            password: hashedPassword,
            salon: '0',
        },
    });
}

main()
    .catch(() => {})
    .finally(() => {
        prisma.$disconnect();
    });
