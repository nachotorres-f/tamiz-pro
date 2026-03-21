import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatearDiaTabla(fecha: Date) {
    const nombreDia = format(fecha, 'EEEE', { locale: es });
    const letraDia = nombreDia.startsWith('mi')
        ? 'X'
        : nombreDia.charAt(0).toUpperCase();

    return `${letraDia} ${format(fecha, 'd')}/${format(fecha, 'M')}`;
}
