import type { SalonPlanificacion } from '@/modules/planificacion/types';

export const PLANIFICACION_AUTO_SAVE_DELAY_MS = 900;
export const PLANIFICACION_AUTO_SAVE_LEGACY_STORAGE_KEY = 'produccionUpdate';

const PLANIFICACION_AUTO_SAVE_STORAGE_KEY_PREFIX =
    'planificacion:produccionUpdate';

export function getPlanificacionAutoSaveStorageKey(
    salon: SalonPlanificacion,
) {
    return `${PLANIFICACION_AUTO_SAVE_STORAGE_KEY_PREFIX}:${salon}`;
}
