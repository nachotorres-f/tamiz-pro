import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcrypt';

async function main() {
    const hashedPassword = await bcrypt.hash('1234', 10);

    await prisma.user.create({
        data: {
            username: 'admin',
            password: hashedPassword,
        },
    });
}

main()
    .catch((e) => {})
    .finally(() => {
        prisma.$disconnect();
    });
