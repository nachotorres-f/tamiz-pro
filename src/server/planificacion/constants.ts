export const PLANIFICACION_TIMEZONE = 'America/Argentina/Buenos_Aires';
export const TIPO_RECETA_PT = 'PT';
export const DIAS_EVENTOS_CICLO = 6;
export const DIAS_INICIO_ADELANTOS = 7;
export const DIAS_PRODUCCION_EXTRA = { anterior: 5, posterior: 9 };
export const LUGARES_SALON_B = ['El Central', 'La Rural'] as const;
export const PLATOS_PADRE_EXCLUIDOS = new Set(['barra de tragos el central']);
export const SUBPLATOS_EXCLUIDOS_POR_PLATO: Record<string, Set<string>> = {
    'mesa dulce': new Set([
        'helado para bochear + insumos (x pax)',
        'patisserie rut',
        'tortas rut',
    ]),
    'mesa dulce menores rut': new Set([
        'carro de plaza',
        'helado para bochear + insumos (x pax)',
        'patisserie rut',
    ]),
};
