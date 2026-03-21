import { addDays, format, startOfWeek } from 'date-fns';
import type {
    ObservacionPlanificacion,
    PlanificacionIngrediente,
    ProduccionChange,
} from '@/modules/planificacion/types';
import {
    PLATOS_PADRE_EXCLUIDOS,
    SUBPLATOS_EXCLUIDOS_POR_PLATO,
    TIPO_RECETA_PT,
} from '@/server/planificacion/constants';
import type {
    PlatoEventoPlanificacion,
    RecetaMaps,
    RecetaPlanificacion,
} from '@/server/planificacion/types';

export function normalizarTexto(valor: string | null | undefined): string {
    return (valor ?? '').trim();
}

export function normalizarFechaInicioDia(valor: Date): Date {
    const fechaNormalizada = new Date(valor);
    fechaNormalizada.setHours(0, 0, 0, 0);
    return fechaNormalizada;
}

function normalizarClave(valor: string | null | undefined): string {
    return normalizarTexto(valor).toLocaleLowerCase('es');
}

export function obtenerDecisionAt(produccion: {
    createdAt: Date;
    updatedAt?: Date | null;
}): Date {
    const createdAt = new Date(produccion.createdAt);
    const updatedAt = produccion.updatedAt
        ? new Date(produccion.updatedAt)
        : null;

    if (!updatedAt || Number.isNaN(updatedAt.getTime())) {
        return createdAt;
    }

    return updatedAt.getTime() > createdAt.getTime() ? updatedAt : createdAt;
}

export function mapearRecetasPlanificacion(
    recetasRaw: Array<{
        codigo: string | null;
        nombreProducto: string | null;
        descripcion: string | null;
        subCodigo: string | null;
        tipo: string;
        porcionBruta: number;
    }>,
): RecetaPlanificacion[] {
    return recetasRaw.map((receta) => ({
        codigo: normalizarTexto(receta.codigo),
        nombreProducto: normalizarTexto(receta.nombreProducto),
        descripcion: normalizarTexto(receta.descripcion),
        subCodigo: normalizarTexto(receta.subCodigo),
        tipo: receta.tipo as 'PT' | 'MP',
        porcionBruta: receta.porcionBruta,
    }));
}

export function crearMapasRecetas(recetas: RecetaPlanificacion[]): RecetaMaps {
    const codigosPT = new Set<string>();
    const recetasPTPorCodigoPadre = new Map<string, RecetaPlanificacion[]>();
    const codigoPorNombreProducto = new Map<string, string>();
    const codigoPorDescripcion = new Map<string, string>();
    const nombrePorCodigoPadre = new Map<string, string>();
    const nombrePorSubCodigo = new Map<string, string>();

    for (const receta of recetas) {
        const codigoPadre = normalizarTexto(receta.codigo);
        const subCodigo = normalizarTexto(receta.subCodigo);
        const nombreProducto = normalizarTexto(receta.nombreProducto);
        const descripcion = normalizarTexto(receta.descripcion);

        if (codigoPadre) {
            nombrePorCodigoPadre.set(codigoPadre, nombreProducto || codigoPadre);
        }

        if (subCodigo) {
            nombrePorSubCodigo.set(subCodigo, descripcion || subCodigo);
        }

        const claveNombreProducto = normalizarClave(nombreProducto);
        if (
            claveNombreProducto &&
            codigoPadre &&
            !codigoPorNombreProducto.has(claveNombreProducto)
        ) {
            codigoPorNombreProducto.set(claveNombreProducto, codigoPadre);
        }

        const claveDescripcion = normalizarClave(descripcion);
        if (
            claveDescripcion &&
            subCodigo &&
            !codigoPorDescripcion.has(claveDescripcion)
        ) {
            codigoPorDescripcion.set(claveDescripcion, subCodigo);
        }

        if (receta.tipo !== TIPO_RECETA_PT || !codigoPadre || !subCodigo) {
            continue;
        }

        codigosPT.add(codigoPadre);

        if (!recetasPTPorCodigoPadre.has(codigoPadre)) {
            recetasPTPorCodigoPadre.set(codigoPadre, []);
        }

        recetasPTPorCodigoPadre.get(codigoPadre)!.push(receta);
    }

    return {
        codigosPT,
        recetasPTPorCodigoPadre,
        codigoPorNombreProducto,
        codigoPorDescripcion,
        nombrePorCodigoPadre,
        nombrePorSubCodigo,
    };
}

export function resolverNombrePlato(
    codigo: string,
    mapas: RecetaMaps,
    fallback: string,
): string {
    const codigoNormalizado = normalizarTexto(codigo);
    if (!codigoNormalizado) {
        return normalizarTexto(fallback);
    }

    return (
        mapas.nombrePorSubCodigo.get(codigoNormalizado) ||
        mapas.nombrePorCodigoPadre.get(codigoNormalizado) ||
        normalizarTexto(fallback) ||
        codigoNormalizado
    );
}

export function resolverNombrePlatoPadre(
    codigoPadre: string,
    mapas: RecetaMaps,
    fallback: string,
): string {
    const codigoNormalizado = normalizarTexto(codigoPadre);
    if (!codigoNormalizado) {
        return normalizarTexto(fallback);
    }

    return (
        mapas.nombrePorCodigoPadre.get(codigoNormalizado) ||
        normalizarTexto(fallback) ||
        codigoNormalizado
    );
}

export function resolverCodigoPlato(
    item: Partial<ProduccionChange | ObservacionPlanificacion>,
    mapas: RecetaMaps,
): string {
    const codigoDirecto = normalizarTexto(item.platoCodigo);
    if (codigoDirecto) {
        return codigoDirecto;
    }

    const porDescripcion = mapas.codigoPorDescripcion.get(
        normalizarClave(item.plato),
    );
    if (porDescripcion) {
        return porDescripcion;
    }

    return mapas.codigoPorNombreProducto.get(normalizarClave(item.plato)) || '';
}

export function resolverCodigoPlatoPadre(
    item: Partial<ProduccionChange | ObservacionPlanificacion>,
    mapas: RecetaMaps,
): string {
    const codigoDirecto = normalizarTexto(item.platoPadreCodigo);
    if (codigoDirecto) {
        return codigoDirecto;
    }

    return (
        mapas.codigoPorNombreProducto.get(normalizarClave(item.platoPadre)) ||
        ''
    );
}

export function construirClaveObservacion(
    platoCodigo: string,
    platoPadreCodigo: string,
): string {
    return `${platoCodigo}|||${platoPadreCodigo}`;
}

export function obtenerObservacionPorCodigos(
    observaciones: ObservacionPlanificacion[],
    mapas: RecetaMaps,
): Map<string, string> {
    const map = new Map<string, string>();

    for (const observacion of observaciones) {
        const platoCodigo = resolverCodigoPlato(observacion, mapas);
        const platoPadreCodigo = resolverCodigoPlatoPadre(observacion, mapas);

        if (!platoCodigo) {
            continue;
        }

        map.set(
            construirClaveObservacion(platoCodigo, platoPadreCodigo),
            normalizarTexto(observacion.observacion),
        );
    }

    return map;
}

function normalizarClaveFiltro(texto: string): string {
    return (texto ?? '').trim().toLocaleLowerCase('es');
}

function debeExcluirSubPlato(
    platoPrincipal: string,
    subPlato: string,
): boolean {
    const subPlatosExcluidos =
        SUBPLATOS_EXCLUIDOS_POR_PLATO[normalizarClaveFiltro(platoPrincipal)];

    if (!subPlatosExcluidos) {
        return false;
    }

    return subPlatosExcluidos.has(normalizarClaveFiltro(subPlato));
}

function debeExcluirPlatoPadre(platoPadre: string): boolean {
    return PLATOS_PADRE_EXCLUIDOS.has(normalizarClaveFiltro(platoPadre));
}

export function calcularRangoSemana(fechaInicio: string): Date {
    return startOfWeek(new Date(fechaInicio), { weekStartsOn: 1 });
}

export function procesarEventosAPlatos(
    eventos: Array<{
        id: number;
        fecha: Date;
        lugar: string;
        Plato: Array<{
            codigo: string | null;
            nombre: string | null;
            fecha: Date | null;
            cantidad: number;
            gestionado: boolean | null;
        }>;
    }>,
    mapasRecetas: RecetaMaps,
): PlatoEventoPlanificacion[] {
    const resultado: PlatoEventoPlanificacion[] = [];

    for (const evento of eventos) {
        for (const plato of evento.Plato) {
            const platoCodigo = normalizarTexto(plato.codigo);

            if (!platoCodigo || !mapasRecetas.codigosPT.has(platoCodigo)) {
                continue;
            }

            resultado.push({
                comandaId: evento.id,
                plato: resolverNombrePlato(platoCodigo, mapasRecetas, plato.nombre || ''),
                platoCodigo,
                fecha: plato.fecha
                    ? format(addDays(plato.fecha, 1), 'yyyy-MM-dd')
                    : format(addDays(evento.fecha, 1), 'yyyy-MM-dd'),
                cantidad: plato.cantidad,
                gestionado: plato.gestionado || false,
                lugar: evento.lugar,
            });
        }
    }

    return resultado.sort((a, b) => a.plato.localeCompare(b.plato));
}

export async function calcularIngredientesConFormato(
    platos: PlatoEventoPlanificacion[],
    mapasRecetas: RecetaMaps,
): Promise<PlanificacionIngrediente[]> {
    const ingredientes = await calcularIngredientesPT(platos, mapasRecetas);

    return ingredientes.map((ingrediente) => ({
        ...ingrediente,
        cantidad: parseFloat(ingrediente.cantidad.toFixed(2)),
    }));
}

async function calcularIngredientesPT(
    platos: PlatoEventoPlanificacion[],
    mapasRecetas: RecetaMaps,
): Promise<PlanificacionIngrediente[]> {
    const resultado: PlanificacionIngrediente[] = [];
    const visitados = new Set<string>();

    async function recorrer(
        codigoPadre: string,
        fecha: string,
        cantidad: number,
        lugar: string,
        comandaId: number,
        platoPrincipal: string,
    ) {
        const subRecetas =
            mapasRecetas.recetasPTPorCodigoPadre.get(codigoPadre) || [];

        for (const receta of subRecetas) {
            const ingrediente = normalizarTexto(receta.descripcion);
            const ingredienteCodigo = normalizarTexto(receta.subCodigo);
            const platoPadre = normalizarTexto(receta.nombreProducto);
            const platoPadreCodigo = normalizarTexto(receta.codigo);
            const porcion = receta.porcionBruta || 1;
            const cantidadTotal = cantidad * porcion;
            const cantidadRedondeada = parseFloat(cantidadTotal.toFixed(2));

            if (!ingredienteCodigo || !platoPadreCodigo) {
                continue;
            }

            if (
                !debeExcluirSubPlato(platoPrincipal, ingrediente) &&
                !debeExcluirPlatoPadre(platoPadre)
            ) {
                resultado.push({
                    plato: ingrediente,
                    platoCodigo: ingredienteCodigo,
                    platoPadre,
                    platoPadreCodigo,
                    fecha,
                    cantidad: cantidadRedondeada,
                    lugar,
                });
            }

            const claveVisitado = `${ingredienteCodigo}|||${platoPadreCodigo}|||${comandaId}`;
            if (!visitados.has(claveVisitado)) {
                visitados.add(claveVisitado);
                await recorrer(
                    ingredienteCodigo,
                    fecha,
                    cantidadRedondeada,
                    lugar,
                    comandaId,
                    platoPrincipal,
                );
            }
        }
    }

    for (const item of platos) {
        await recorrer(
            item.platoCodigo,
            item.fecha,
            item.cantidad,
            item.lugar,
            item.comandaId,
            item.plato,
        );
    }

    const agrupado = new Map<string, PlanificacionIngrediente>();

    for (const item of resultado) {
        const key = `${item.platoCodigo}_${item.platoPadreCodigo}_${item.fecha}`;
        if (!agrupado.has(key)) {
            agrupado.set(key, { ...item });
        } else {
            agrupado.get(key)!.cantidad += item.cantidad;
        }
    }

    return Array.from(agrupado.values());
}

export function mapearProduccionConNombres(
    produccion: Array<{
        cantidad: number;
        createdAt: Date;
        fecha: Date;
        observacion: string | null;
        plato: string;
        platoCodigo: string;
        platoPadre: string;
        platoPadreCodigo: string;
        salon: string | null;
        updatedAt: Date | null;
        id: number;
    }>,
    mapasRecetas: RecetaMaps,
    inicioCiclo: Date,
) {
    return produccion.map((prod) => ({
        ...prod,
        plato: resolverNombrePlato(prod.platoCodigo, mapasRecetas, prod.plato),
        platoPadre: resolverNombrePlatoPadre(
            prod.platoPadreCodigo,
            mapasRecetas,
            prod.platoPadre,
        ),
        cantidad: parseFloat(prod.cantidad.toFixed(2)),
        esAnteriorACiclo:
            obtenerDecisionAt(prod).getTime() < inicioCiclo.getTime(),
    }));
}

export function maxRepeticionesPorDia(
    eventos: Array<{ fecha: Date | string }>,
) {
    const contador: Record<string, number> = {};

    for (const item of eventos) {
        const dia = new Date(item.fecha).toISOString().split('T')[0];
        contador[dia] = (contador[dia] || 0) + 1;
    }

    const valores = Object.values(contador);
    if (valores.length === 0) {
        return 0;
    }

    return Math.max(...valores);
}
