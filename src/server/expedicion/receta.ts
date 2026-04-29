import { prisma } from '@/lib/prisma';

export interface ExpedicionIngredienteDetalle {
    codigo: string;
    subCodigo: string;
    descripcion: string;
    tipo: string;
    unidadMedida: string;
    porcionBruta: number;
    check: boolean;
    puedeExpedir: boolean;
}

export interface ExpedicionRecetaNodo {
    codigo: string;
    nombre: string;
    cantidad: number;
    ingredientes: ExpedicionIngredienteDetalle[];
    subrecetas: ExpedicionRecetaNodo[];
}

export interface ExpedicionResumen {
    ingredientesTotales: number;
    ingredientesExpedidos: number;
}

export interface ExpedicionPlatoResumen extends ExpedicionResumen {
    platoId: number;
    codigo: string;
    nombre: string;
    cantidad: number;
    tieneReceta: boolean;
}

export interface ExpedicionRecetaDetalle {
    comandaId: number;
    plato: {
        id: number;
        codigo: string;
        nombre: string;
        cantidad: number;
    };
    recetaDirecta: ExpedicionRecetaNodo | null;
    resumen: ExpedicionResumen;
}

const normalizarTexto = (valor: string | null | undefined) =>
    String(valor ?? '').trim();

const crearClaveExpedicion = (codigo: string, subCodigo: string) =>
    `${codigo}|||${subCodigo}`;

const obtenerChecksComanda = async (comandaId: number) => {
    const checks = await prisma.expedicion.findMany({
        where: { comandaId },
        select: {
            codigo: true,
            subCodigo: true,
        },
    });

    return new Set(
        checks.map((check) =>
            crearClaveExpedicion(
                normalizarTexto(check.codigo),
                normalizarTexto(check.subCodigo),
            ),
        ),
    );
};

const construirNodoReceta = async (
    codigo: string,
    nombre: string,
    cantidad: number,
    checks: Set<string>,
    visitados: Set<string>,
): Promise<ExpedicionRecetaNodo | null> => {
    const codigoNormalizado = normalizarTexto(codigo);

    if (!codigoNormalizado) {
        return null;
    }

    const recetas = await prisma.receta.findMany({
        where: {
            codigo: codigoNormalizado,
        },
        orderBy: {
            id: 'asc',
        },
    });

    if (recetas.length === 0) {
        return null;
    }

    const ingredientes: ExpedicionIngredienteDetalle[] = recetas.map((receta) => {
        const subCodigo = normalizarTexto(receta.subCodigo);
        const codigoPadre = normalizarTexto(receta.codigo);

        return {
            codigo: codigoPadre,
            subCodigo,
            descripcion:
                normalizarTexto(receta.descripcion) || subCodigo || 'Sin descripcion',
            tipo: normalizarTexto(receta.tipo) || '-',
            unidadMedida: normalizarTexto(receta.unidadMedida) || '-',
            porcionBruta: Number((receta.porcionBruta * cantidad).toFixed(4)),
            check: checks.has(crearClaveExpedicion(codigoPadre, subCodigo)),
            puedeExpedir: Boolean(codigoPadre && subCodigo),
        };
    });

    const subrecetas: ExpedicionRecetaNodo[] = [];

    for (const receta of recetas) {
        const subCodigo = normalizarTexto(receta.subCodigo);

        if (normalizarTexto(receta.tipo) !== 'PT' || !subCodigo) {
            continue;
        }

        if (visitados.has(subCodigo)) {
            continue;
        }

        const siguienteVisitados = new Set(visitados);
        siguienteVisitados.add(subCodigo);

        const cantidadSubreceta = receta.porcionBruta * cantidad;
        const subreceta = await construirNodoReceta(
            subCodigo,
            normalizarTexto(receta.descripcion) || subCodigo,
            cantidadSubreceta,
            checks,
            siguienteVisitados,
        );

        if (subreceta) {
            subrecetas.push(subreceta);
        }
    }

    return {
        codigo: codigoNormalizado,
        nombre: normalizarTexto(nombre) || codigoNormalizado,
        cantidad: Number(cantidad.toFixed(4)),
        ingredientes,
        subrecetas,
    };
};

const resumirNodoReceta = (
    nodo: ExpedicionRecetaNodo | null,
): ExpedicionResumen => {
    if (!nodo) {
        return {
            ingredientesTotales: 0,
            ingredientesExpedidos: 0,
        };
    }

    const resumenActual = nodo.ingredientes.reduce<ExpedicionResumen>(
        (acumulado, ingrediente) => ({
            ingredientesTotales:
                acumulado.ingredientesTotales +
                (ingrediente.puedeExpedir ? 1 : 0),
            ingredientesExpedidos:
                acumulado.ingredientesExpedidos +
                (ingrediente.puedeExpedir && ingrediente.check ? 1 : 0),
        }),
        {
            ingredientesTotales: 0,
            ingredientesExpedidos: 0,
        },
    );

    return nodo.subrecetas.reduce<ExpedicionResumen>(
        (acumulado, subreceta) => {
            const resumenSubreceta = resumirNodoReceta(subreceta);

            return {
                ingredientesTotales:
                    acumulado.ingredientesTotales +
                    resumenSubreceta.ingredientesTotales,
                ingredientesExpedidos:
                    acumulado.ingredientesExpedidos +
                    resumenSubreceta.ingredientesExpedidos,
            };
        },
        resumenActual,
    );
};

export async function obtenerResumenesExpedicionPlatos(
    comandaId: number,
    platos: Array<{
        id: number;
        codigo: string | null;
        nombre: string;
        cantidad: number;
    }>,
): Promise<ExpedicionPlatoResumen[]> {
    const checks = await obtenerChecksComanda(comandaId);

    return Promise.all(
        platos.map(async (plato) => {
            const codigo = normalizarTexto(plato.codigo);
            const recetaDirecta = await construirNodoReceta(
                codigo,
                plato.nombre,
                plato.cantidad,
                checks,
                new Set(codigo ? [codigo] : []),
            );
            const resumen = resumirNodoReceta(recetaDirecta);

            return {
                platoId: plato.id,
                codigo,
                nombre: normalizarTexto(plato.nombre) || codigo || 'Sin nombre',
                cantidad: plato.cantidad,
                tieneReceta: Boolean(recetaDirecta),
                ...resumen,
            };
        }),
    );
}

export async function obtenerDetalleRecetaExpedicion(
    comandaId: number,
    platoId: number,
): Promise<ExpedicionRecetaDetalle | null> {
    const plato = await prisma.plato.findFirst({
        where: {
            id: platoId,
            comandaId,
        },
        select: {
            id: true,
            nombre: true,
            codigo: true,
            cantidad: true,
        },
    });

    if (!plato) {
        return null;
    }

    const checks = await obtenerChecksComanda(comandaId);
    const codigo = normalizarTexto(plato.codigo);
    const recetaDirecta = await construirNodoReceta(
        codigo,
        plato.nombre,
        plato.cantidad,
        checks,
        new Set(codigo ? [codigo] : []),
    );

    return {
        comandaId,
        plato: {
            id: plato.id,
            codigo,
            nombre: normalizarTexto(plato.nombre) || codigo || 'Sin nombre',
            cantidad: plato.cantidad,
        },
        recetaDirecta,
        resumen: resumirNodoReceta(recetaDirecta),
    };
}
