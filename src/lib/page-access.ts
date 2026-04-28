export interface PageAccessItem {
    key: string;
    path: string;
    label: string;
}

export const PAGE_ACCESS_CATALOG: PageAccessItem[] = [
    { key: 'calendario', path: '/calendario', label: 'Calendario' },
    { key: 'planificacion', path: '/planificacion', label: 'Planificacion' },
    { key: 'produccion', path: '/produccion', label: 'Produccion' },
    { key: 'entregaMP', path: '/entregaMP', label: 'Entrega de MP' },
    { key: 'expedicion', path: '/expedicion', label: 'Expedicion' },
    { key: 'picking', path: '/picking', label: 'Picking' },
    { key: 'usuarios', path: '/usuarios', label: 'Usuarios' },
];

const PAGE_KEY_SET = new Set(PAGE_ACCESS_CATALOG.map((page) => page.key));

export const PUBLIC_AUTH_PATH = '/acceso';
export const ACCESS_DENIED_PATH = '/acceso-denegado';

export function getDefaultPageAccessByRole(rol: string): string[] {
    if (rol === 'admin') {
        return PAGE_ACCESS_CATALOG.map((page) => page.key);
    }

    if (rol === 'editor' || rol === 'consultor') {
        return PAGE_ACCESS_CATALOG.filter((page) => page.key !== 'usuarios').map(
            (page) => page.key,
        );
    }

    return [];
}

export function normalizeAllowedPageKeys(pageKeys: string[]): string[] {
    return Array.from(
        new Set(pageKeys.filter((pageKey) => PAGE_KEY_SET.has(pageKey))),
    );
}

export function getEffectiveAllowedPageKeys(input: {
    rol: string;
    pageAccessConfigured?: boolean;
    pageAccess?: Array<{ pageKey: string }>;
}): string[] {
    const persistedKeys = normalizeAllowedPageKeys(
        (input.pageAccess || []).map((item) => item.pageKey),
    );

    const hasExplicitPageAccessConfig =
        input.pageAccessConfigured ?? persistedKeys.length > 0;

    if (hasExplicitPageAccessConfig) {
        return persistedKeys;
    }

    return getDefaultPageAccessByRole(input.rol);
}

export function getAccessibleRoutes(pageKeys: string[]): PageAccessItem[] {
    const normalizedKeys = new Set(normalizeAllowedPageKeys(pageKeys));

    return PAGE_ACCESS_CATALOG.filter((page) => normalizedKeys.has(page.key));
}

export function getDefaultRedirectPath(pageKeys: string[]): string | null {
    return getAccessibleRoutes(pageKeys)[0]?.path || null;
}

export function canAccessPath(pathname: string, pageKeys: string[]): boolean {
    if (pathname === '/' || pathname === PUBLIC_AUTH_PATH) {
        return true;
    }

    if (pathname === ACCESS_DENIED_PATH) {
        return true;
    }

    const route = PAGE_ACCESS_CATALOG.find((item) => item.path === pathname);

    if (!route) {
        return false;
    }

    return normalizeAllowedPageKeys(pageKeys).includes(route.key);
}
