import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        // log: ['query'],
    });

async function main() {
    await prisma.user.updateMany({
        where: { id: { in: [] } },
        data: { rol: { set: ['ADMINISTRADOR'] } },
    });
}

main()
    .catch(() => {})
    .finally(() => {
        prisma.$disconnect();
    });
