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

    console.log('✅ Usuario insertado');
}

main()
    .catch((e) => {
        console.error('❌ Error al insertar usuario:', e);
    })
    .finally(() => {
        prisma.$disconnect();
    });
