const { spawnSync } = require('node:child_process');
const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(process.cwd(), '.env') });

const [, , target, ...prismaArgs] = process.argv;

if (!target || prismaArgs.length === 0) {
    console.error(
        'Usage: node scripts/prisma-env.cjs <dev|prod> <prisma args...>',
    );
    process.exit(1);
}

if (target !== 'dev' && target !== 'prod') {
    console.error(`Unknown Prisma target "${target}". Use "dev" or "prod".`);
    process.exit(1);
}

const envVarName =
    target === 'prod' ? 'DATABASE_URL_PROD' : 'DATABASE_URL_DEV';

const databaseUrl =
    process.env[envVarName] ||
    (target === 'dev' ? process.env.DATABASE_URL : undefined);

if (!databaseUrl) {
    console.error(
        `Missing ${envVarName}${target === 'dev' ? ' (or DATABASE_URL)' : ''} in .env`,
    );
    process.exit(1);
}

console.log(
    `[prisma:${target}] Running "prisma ${prismaArgs.join(' ')}" with ${envVarName}${target === 'dev' && !process.env[envVarName] ? ' (fallback DATABASE_URL)' : ''}`,
);

const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['prisma', ...prismaArgs],
    {
        stdio: 'inherit',
        env: {
            ...process.env,
            DATABASE_URL: databaseUrl,
        },
    },
);

if (result.error) {
    console.error(result.error);
    process.exit(1);
}

process.exit(result.status ?? 1);
