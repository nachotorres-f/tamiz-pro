import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

interface PlatoPayload {
    platoCodigo?: string;
    platoPadreCodigo?: string;
    cantidad?: number | string;
    fecha?: string;
    salon?: string;
    filaId?: number | string;
}

interface Body extends PlatoPayload {
    platos?: PlatoPayload[];
}

interface PlatoNormalizado {
    index: number;
    filaId: number | null;
    platoCodigo: string;
    platoPadreCodigo: string;
    cantidad: number;
    fecha: string;
    salon: string;
}

interface PadreCandidato {
    codigo: string;
    nombre: string;
}

interface PlatoResuelto extends PlatoNormalizado {
    platoPadreCodigoFinal: string;
    platoPadreFinal: string;
    platoNombre: string;
}

interface PlatoAmbiguo {
    index: number;
    filaId: number | null;
    platoCodigo: string;
    fecha: string;
    cantidad: number;
    padres: PadreCandidato[];
}

const TIPO_RECETA_PADRE = 'PT';
const CODIGO_ERROR_AMBIGUO = 'PLATO_PADRE_AMBIGUO';

const normalizarPayload = (payload: Body): PlatoPayload[] => {
    if (Array.isArray(payload.platos) && payload.platos.length > 0) {
        return payload.platos.map((plato) => ({
            ...plato,
            salon: plato.salon ?? payload.salon,
        }));
    }

    return [payload];
};

const sanitizarPlatos = (platos: PlatoPayload[]) => {
    const invalidos: Array<{ index: number; plato: PlatoPayload }> = [];
    const normalizados: PlatoNormalizado[] = [];

    platos.forEach((plato, index) => {
        const platoCodigo = String(plato.platoCodigo ?? '').trim();
        const platoPadreCodigo = String(plato.platoPadreCodigo ?? '').trim();
        const fecha = String(plato.fecha ?? '').trim();
        const salon = String(plato.salon ?? '').trim();
        const filaIdNum = Number(plato.filaId);
        const filaId = Number.isFinite(filaIdNum) ? Math.trunc(filaIdNum) : null;
        const cantidadNum = Number(plato.cantidad);
        const fechaNormalizada = new Date(fecha.split('T')[0]);

        if (
            !platoCodigo ||
            !fecha ||
            !salon ||
            !Number.isFinite(cantidadNum) ||
            cantidadNum <= 0 ||
            !Number.isFinite(fechaNormalizada.getTime())
        ) {
            invalidos.push({ index, plato });
            return;
        }

        normalizados.push({
            index,
            filaId,
            platoCodigo,
            platoPadreCodigo,
            cantidad: Number(cantidadNum.toFixed(2)),
            fecha,
            salon,
        });
    });

    return { invalidos, normalizados };
};

const crearMapaPadresPorSubCodigo = (
    recetas: Array<{
        subCodigo: string;
        codigo: string;
        nombreProducto: string;
    }>,
) => {
    const padresPorSubCodigo = new Map<string, PadreCandidato[]>();
    const clavesPorSubCodigo = new Map<string, Set<string>>();

    for (const receta of recetas) {
        const subCodigo = String(receta.subCodigo ?? '').trim();
        const codigoPadre = String(receta.codigo ?? '').trim();
        const nombrePadre = String(receta.nombreProducto ?? '').trim();

        if (!subCodigo || !codigoPadre) {
            continue;
        }

        if (!padresPorSubCodigo.has(subCodigo)) {
            padresPorSubCodigo.set(subCodigo, []);
        }

        if (!clavesPorSubCodigo.has(subCodigo)) {
            clavesPorSubCodigo.set(subCodigo, new Set<string>());
        }

        const clave = `${subCodigo}|||${codigoPadre}`;
        if (clavesPorSubCodigo.get(subCodigo)!.has(clave)) {
            continue;
        }

        clavesPorSubCodigo.get(subCodigo)!.add(clave);
        padresPorSubCodigo.get(subCodigo)!.push({
            codigo: codigoPadre,
            nombre: nombrePadre || codigoPadre,
        });
    }

    return padresPorSubCodigo;
};

const sumarCantidades = (
    registros: Array<{
        cantidad: number;
    }>,
): number => registros.reduce((acumulado, registro) => acumulado + registro.cantidad, 0);

export async function POST(req: NextRequest) {
    process.env.TZ = 'America/Argentina/Buenos_Aires';

    let body: Body | null = null;

    try {
        const payload = (await req.json()) as Body;
        body = payload;

        const platosRecibidos = normalizarPayload(payload);
        const { invalidos, normalizados } = sanitizarPlatos(platosRecibidos);

        if (normalizados.length === 0 || invalidos.length > 0) {
            await logAudit({
                modulo: 'produccion',
                accion: 'agregar_plato_produccion',
                ruta: '/api/produccion/plato',
                metodo: 'POST',
                estado: 'warning',
                resumen: 'Datos incompletos para agregar platos a producción',
                detalle: {
                    payload,
                    invalidos,
                },
            });

            return NextResponse.json(
                { error: 'Datos incompletos' },
                { status: 400 },
            );
        }

        const codigos = Array.from(new Set(normalizados.map((item) => item.platoCodigo)));

        const [recetasPorCodigoRaw, recetasPadreRaw] = await Promise.all([
            prisma.receta.findMany({
                where: { codigo: { in: codigos } },
                select: {
                    codigo: true,
                    nombreProducto: true,
                },
            }),
            prisma.receta.findMany({
                where: {
                    subCodigo: { in: codigos },
                    tipo: TIPO_RECETA_PADRE,
                },
                select: {
                    subCodigo: true,
                    codigo: true,
                    nombreProducto: true,
                },
                orderBy: {
                    id: 'asc',
                },
            }),
        ]);

        const recetasPorCodigo = new Map(
            recetasPorCodigoRaw.map((receta) => [
                String(receta.codigo ?? '').trim(),
                String(receta.nombreProducto ?? '').trim(),
            ]),
        );

        const codigosFaltantes = codigos.filter(
            (codigo) => !recetasPorCodigo.has(codigo),
        );

        if (codigosFaltantes.length > 0) {
            await logAudit({
                modulo: 'produccion',
                accion: 'agregar_plato_produccion',
                ruta: '/api/produccion/plato',
                metodo: 'POST',
                estado: 'warning',
                resumen:
                    'No se encontraron recetas para uno o más códigos en producción',
                detalle: {
                    codigosFaltantes,
                    payload,
                },
            });

            return NextResponse.json(
                { error: 'No se encontró receta para el código enviado' },
                { status: 400 },
            );
        }

        const padresPorSubCodigo = crearMapaPadresPorSubCodigo(
            recetasPadreRaw.map((receta) => ({
                subCodigo: String(receta.subCodigo ?? '').trim(),
                codigo: String(receta.codigo ?? '').trim(),
                nombreProducto: String(receta.nombreProducto ?? '').trim(),
            })),
        );

        const ambiguos: PlatoAmbiguo[] = [];
        const platosResueltos: PlatoResuelto[] = [];

        for (const plato of normalizados) {
            const platoNombre = recetasPorCodigo.get(plato.platoCodigo) || '';
            const padresCandidatos = padresPorSubCodigo.get(plato.platoCodigo) || [];

            if (padresCandidatos.length === 0) {
                platosResueltos.push({
                    ...plato,
                    platoNombre,
                    platoPadreCodigoFinal: '',
                    platoPadreFinal: '',
                });
                continue;
            }

            if (padresCandidatos.length === 1) {
                platosResueltos.push({
                    ...plato,
                    platoNombre,
                    platoPadreCodigoFinal: padresCandidatos[0].codigo,
                    platoPadreFinal: padresCandidatos[0].nombre,
                });
                continue;
            }

            const padreElegido = padresCandidatos.find(
                (padre) => padre.codigo === plato.platoPadreCodigo,
            );

            if (padreElegido) {
                platosResueltos.push({
                    ...plato,
                    platoNombre,
                    platoPadreCodigoFinal: padreElegido.codigo,
                    platoPadreFinal: padreElegido.nombre,
                });
                continue;
            }

            ambiguos.push({
                index: plato.index,
                filaId: plato.filaId,
                platoCodigo: plato.platoCodigo,
                fecha: plato.fecha.split('T')[0],
                cantidad: plato.cantidad,
                padres: padresCandidatos,
            });
        }

        if (ambiguos.length > 0) {
            await logAudit({
                modulo: 'produccion',
                accion: 'agregar_plato_produccion',
                ruta: '/api/produccion/plato',
                metodo: 'POST',
                estado: 'warning',
                resumen:
                    'Se requiere seleccionar plato padre para completar el alta',
                detalle: {
                    payload,
                    ambiguos,
                },
            });

            return NextResponse.json(
                {
                    error: 'El plato tiene más de un plato padre',
                    code: CODIGO_ERROR_AMBIGUO,
                    ambiguos,
                },
                { status: 409 },
            );
        }

        const resultados: Array<{
            platoCodigo: string;
            platoPadreCodigo: string;
            fecha: string;
            cantidad: number;
            salon: string;
            modo: 'update' | 'create';
        }> = [];

        await prisma.$transaction(async (tx) => {
            for (const plato of platosResueltos) {
                const fecha = new Date(plato.fecha.split('T')[0]);
                const whereBase = {
                    platoCodigo: plato.platoCodigo,
                    fecha,
                    salon: plato.salon,
                };

                if (plato.platoPadreCodigoFinal) {
                    const [existentesPadre, huerfanos] = await Promise.all([
                        tx.produccion.findMany({
                            where: {
                                ...whereBase,
                                platoPadreCodigo: plato.platoPadreCodigoFinal,
                            },
                            orderBy: {
                                id: 'asc',
                            },
                        }),
                        tx.produccion.findMany({
                            where: {
                                ...whereBase,
                                platoPadreCodigo: '',
                            },
                            orderBy: {
                                id: 'asc',
                            },
                        }),
                    ]);

                    if (existentesPadre.length > 0) {
                        const principalPadre = existentesPadre[0];
                        const existentesPadreExtra = existentesPadre.slice(1);
                        const totalPadreExtra = sumarCantidades(existentesPadreExtra);
                        const totalHuerfanos = sumarCantidades(huerfanos);
                        const idsEliminar = [
                            ...existentesPadreExtra.map((registro) => registro.id),
                            ...huerfanos.map((registro) => registro.id),
                        ];

                        await tx.produccion.update({
                            where: { id: principalPadre.id },
                            data: {
                                plato: plato.platoNombre,
                                platoCodigo: plato.platoCodigo,
                                platoPadre: plato.platoPadreFinal,
                                platoPadreCodigo: plato.platoPadreCodigoFinal,
                                cantidad:
                                    principalPadre.cantidad +
                                    plato.cantidad +
                                    totalPadreExtra +
                                    totalHuerfanos,
                            },
                        });

                        if (idsEliminar.length > 0) {
                            await tx.produccion.deleteMany({
                                where: {
                                    id: {
                                        in: idsEliminar,
                                    },
                                },
                            });
                        }

                        resultados.push({
                            platoCodigo: plato.platoCodigo,
                            platoPadreCodigo: plato.platoPadreCodigoFinal,
                            fecha: plato.fecha.split('T')[0],
                            cantidad: plato.cantidad,
                            salon: plato.salon,
                            modo: 'update',
                        });
                        continue;
                    }

                    if (huerfanos.length > 0) {
                        const huerfanoPrincipal = huerfanos[0];
                        const huerfanosExtra = huerfanos.slice(1);
                        const totalHuerfanosExtra = sumarCantidades(huerfanosExtra);

                        await tx.produccion.update({
                            where: { id: huerfanoPrincipal.id },
                            data: {
                                plato: plato.platoNombre,
                                platoCodigo: plato.platoCodigo,
                                platoPadre: plato.platoPadreFinal,
                                platoPadreCodigo: plato.platoPadreCodigoFinal,
                                cantidad:
                                    huerfanoPrincipal.cantidad +
                                    plato.cantidad +
                                    totalHuerfanosExtra,
                            },
                        });

                        if (huerfanosExtra.length > 0) {
                            await tx.produccion.deleteMany({
                                where: {
                                    id: {
                                        in: huerfanosExtra.map(
                                            (registro) => registro.id,
                                        ),
                                    },
                                },
                            });
                        }

                        resultados.push({
                            platoCodigo: plato.platoCodigo,
                            platoPadreCodigo: plato.platoPadreCodigoFinal,
                            fecha: plato.fecha.split('T')[0],
                            cantidad: plato.cantidad,
                            salon: plato.salon,
                            modo: 'update',
                        });
                        continue;
                    }

                    await tx.produccion.create({
                        data: {
                            plato: plato.platoNombre,
                            platoCodigo: plato.platoCodigo,
                            platoPadre: plato.platoPadreFinal,
                            platoPadreCodigo: plato.platoPadreCodigoFinal,
                            cantidad: plato.cantidad,
                            fecha,
                            salon: plato.salon,
                        },
                    });

                    resultados.push({
                        platoCodigo: plato.platoCodigo,
                        platoPadreCodigo: plato.platoPadreCodigoFinal,
                        fecha: plato.fecha.split('T')[0],
                        cantidad: plato.cantidad,
                        salon: plato.salon,
                        modo: 'create',
                    });
                    continue;
                }

                const huerfanos = await tx.produccion.findMany({
                    where: {
                        ...whereBase,
                        platoPadreCodigo: '',
                    },
                    orderBy: {
                        id: 'asc',
                    },
                });

                if (huerfanos.length > 0) {
                    const huerfanoPrincipal = huerfanos[0];
                    const huerfanosExtra = huerfanos.slice(1);
                    const totalHuerfanosExtra = sumarCantidades(huerfanosExtra);

                    await tx.produccion.update({
                        where: { id: huerfanoPrincipal.id },
                        data: {
                            plato: plato.platoNombre,
                            platoCodigo: plato.platoCodigo,
                            platoPadre: '',
                            platoPadreCodigo: '',
                            cantidad:
                                huerfanoPrincipal.cantidad +
                                plato.cantidad +
                                totalHuerfanosExtra,
                        },
                    });

                    if (huerfanosExtra.length > 0) {
                        await tx.produccion.deleteMany({
                            where: {
                                id: {
                                    in: huerfanosExtra.map(
                                        (registro) => registro.id,
                                    ),
                                },
                            },
                        });
                    }

                    resultados.push({
                        platoCodigo: plato.platoCodigo,
                        platoPadreCodigo: '',
                        fecha: plato.fecha.split('T')[0],
                        cantidad: plato.cantidad,
                        salon: plato.salon,
                        modo: 'update',
                    });
                    continue;
                }

                await tx.produccion.create({
                    data: {
                        plato: plato.platoNombre,
                        platoCodigo: plato.platoCodigo,
                        platoPadre: '',
                        platoPadreCodigo: '',
                        cantidad: plato.cantidad,
                        fecha,
                        salon: plato.salon,
                    },
                });

                resultados.push({
                    platoCodigo: plato.platoCodigo,
                    platoPadreCodigo: '',
                    fecha: plato.fecha.split('T')[0],
                    cantidad: plato.cantidad,
                    salon: plato.salon,
                    modo: 'create',
                });
            }
        });

        await logAudit({
            modulo: 'produccion',
            accion: 'agregar_plato_produccion',
            ruta: '/api/produccion/plato',
            metodo: 'POST',
            resumen: `Se agregaron ${resultados.length} platos en producción`,
            detalle: {
                total: resultados.length,
                resultados,
            },
        });

        return NextResponse.json({ ok: true, total: resultados.length });
    } catch (error) {
        await logAudit({
            modulo: 'produccion',
            accion: 'agregar_plato_produccion',
            ruta: '/api/produccion/plato',
            metodo: 'POST',
            estado: 'error',
            resumen: 'Error agregando platos a producción',
            detalle: {
                body,
                error: error instanceof Error ? error.message : String(error),
            },
        });

        return NextResponse.json(
            { error: 'Error al agregar platos a producción' },
            { status: 500 },
        );
    }
}
