# Repository Guidelines

## Project Structure & Module Organization
`src/app` contains App Router pages and API route handlers under `src/app/api/**/route.ts`. Shared UI lives in `src/components`, reusable helpers in `src/lib`, and feature-specific code in `src/modules` and `src/server` (`repositories`, `services`, validators, mappers). Database schema and migrations live in `prisma/`, public assets in `public/`, and local tooling scripts in `scripts/`. Root `middleware.ts` enforces auth outside `/acceso`.

## Build, Test, and Development Commands
- `npm run dev`: start local development against `DATABASE_URL_DEV` with Turbopack.
- `npm run dev:prod`: run locally against `DATABASE_URL_PROD` without editing `.env`.
- `npm run build`: generate Prisma client and create the production build.
- `npm run start`: serve the built app.
- `npm run lint`: run ESLint with Next.js core-web-vitals and TypeScript rules.
- `npm run prisma:push:dev` / `npm run prisma:generate`: sync schema and refresh Prisma client.
- `npm run prisma:migrate:dev -- --name <change>`: create and apply a versioned migration.

## Coding Style & Naming Conventions
Use TypeScript with `strict` mode and the `@/*` path alias from `tsconfig.json`. Follow the existing Next.js style: single quotes in TS/TSX, semicolons enabled, and keep functions/components small. Prefer `PascalCase` for React component exports, `camelCase` for hooks, utilities, and variables, and `route.ts` for API handlers. Place domain logic in `src/server/services` or `src/modules`, not directly inside route handlers or page components.

## Testing Guidelines
There is no automated test suite committed yet. Before opening a PR, run `npm run lint`, verify the affected screen locally, and smoke-test the related API route when backend logic changes. For future coverage, add tests close to the feature (`src/modules/<feature>` or `src/server/<domain>`) and use `*.test.ts` / `*.test.tsx` naming.

## Commit & Pull Request Guidelines
Recent history follows short, imperative Conventional Commit-style subjects such as `feat(planificacion): ...`, `fix(planificacion): ...`, `refactor(...)`, and `chore(prisma): ...`. Keep subjects scoped to the touched module. PRs should include a concise description, linked issue or context, notes for schema or env changes, and screenshots for UI changes. If Prisma schema changes, mention the required migration or `db push` step explicitly.

## Security & Configuration Tips
Do not commit `.env` values, production credentials, or API keys. Keep `DATABASE_URL_DEV`, `DATABASE_URL_PROD`, `JWT_SECRET`, and `API_KEY` consistent with the environment scripts in `scripts/app-env.cjs` and `scripts/prisma-env.cjs`.
