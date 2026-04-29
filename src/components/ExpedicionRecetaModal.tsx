'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Accordion,
    Alert,
    Badge,
    Button,
    Form,
    Modal,
    Placeholder,
    Table,
} from 'react-bootstrap';
import type {
    ExpedicionPlatoResumen,
    ExpedicionRecetaDetalle,
    ExpedicionRecetaNodo,
    ExpedicionResumen,
} from '@/server/expedicion/receta';

interface ExpedicionRecetaModalProps {
    comandaId: number | null;
    plato: ExpedicionPlatoResumen | null;
    readOnly: boolean;
    show: boolean;
    onClose: () => void;
    onResumenActualizado: (
        platoId: number,
        resumen: Pick<
            ExpedicionPlatoResumen,
            'ingredientesTotales' | 'ingredientesExpedidos'
        >,
    ) => void;
}

const normalizarNumero = (valor: number) =>
    Number(valor.toFixed(4)).toString();

const actualizarCheckEnNodo = (
    nodo: ExpedicionRecetaNodo,
    codigo: string,
    subCodigo: string,
    checked: boolean,
): ExpedicionRecetaNodo => ({
    ...nodo,
    ingredientes: nodo.ingredientes.map((ingrediente) =>
        ingrediente.codigo === codigo && ingrediente.subCodigo === subCodigo
            ? { ...ingrediente, check: checked }
            : ingrediente,
    ),
    subrecetas: nodo.subrecetas.map((subreceta) =>
        actualizarCheckEnNodo(subreceta, codigo, subCodigo, checked),
    ),
});

const actualizarChecksEnLote = (
    nodo: ExpedicionRecetaNodo,
    ingredientesActualizar: Array<{
        codigo: string;
        subCodigo: string;
    }>,
    checked: boolean,
): ExpedicionRecetaNodo => {
    const clavesActualizar = new Set(
        ingredientesActualizar.map(
            (ingrediente) => `${ingrediente.codigo}|||${ingrediente.subCodigo}`,
        ),
    );

    return {
        ...nodo,
        ingredientes: nodo.ingredientes.map((ingrediente) =>
            clavesActualizar.has(
                `${ingrediente.codigo}|||${ingrediente.subCodigo}`,
            )
                ? { ...ingrediente, check: checked }
                : ingrediente,
        ),
        subrecetas: nodo.subrecetas.map((subreceta) =>
            actualizarChecksEnLote(subreceta, ingredientesActualizar, checked),
        ),
    };
};

const obtenerIngredientesPendientesNodo = (
    nodo: ExpedicionRecetaNodo,
): Array<{
    codigo: string;
    subCodigo: string;
}> => {
    const ingredientesPropios = nodo.ingredientes
        .filter((ingrediente) => ingrediente.puedeExpedir && !ingrediente.check)
        .map((ingrediente) => ({
            codigo: ingrediente.codigo,
            subCodigo: ingrediente.subCodigo,
        }));

    return nodo.subrecetas.reduce<Array<{ codigo: string; subCodigo: string }>>(
        (acumulado, subreceta) => [
            ...acumulado,
            ...obtenerIngredientesPendientesNodo(subreceta),
        ],
        ingredientesPropios,
    );
};

const obtenerIngredientesMarcadosNodo = (
    nodo: ExpedicionRecetaNodo,
): Array<{
    codigo: string;
    subCodigo: string;
}> => {
    const ingredientesPropios = nodo.ingredientes
        .filter((ingrediente) => ingrediente.puedeExpedir && ingrediente.check)
        .map((ingrediente) => ({
            codigo: ingrediente.codigo,
            subCodigo: ingrediente.subCodigo,
        }));

    return nodo.subrecetas.reduce<Array<{ codigo: string; subCodigo: string }>>(
        (acumulado, subreceta) => [
            ...acumulado,
            ...obtenerIngredientesMarcadosNodo(subreceta),
        ],
        ingredientesPropios,
    );
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

    const propio = nodo.ingredientes.reduce<ExpedicionResumen>(
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

    return nodo.subrecetas.reduce<ExpedicionResumen>((acumulado, subreceta) => {
        const resumenSubreceta = resumirNodoReceta(subreceta);

        return {
            ingredientesTotales:
                acumulado.ingredientesTotales +
                resumenSubreceta.ingredientesTotales,
            ingredientesExpedidos:
                acumulado.ingredientesExpedidos +
                resumenSubreceta.ingredientesExpedidos,
        };
    }, propio);
};

function RecetaNodoTabla({
    nodo,
    onToggleIngrediente,
    onExpedirNodo,
    onDesmarcarNodo,
    readOnly,
}: {
    nodo: ExpedicionRecetaNodo;
    onToggleIngrediente: (
        checked: boolean,
        codigo: string,
        subCodigo: string,
    ) => void;
    onExpedirNodo: (nodo: ExpedicionRecetaNodo) => void;
    onDesmarcarNodo: (nodo: ExpedicionRecetaNodo) => void;
    readOnly: boolean;
}) {
    const ingredientesPendientes = obtenerIngredientesPendientesNodo(nodo);
    const ingredientesMarcados = obtenerIngredientesMarcadosNodo(nodo);

    return (
        <>
            <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                <span className="fw-semibold">
                    {nodo.nombre}
                    {nodo.codigo ? ` (${nodo.codigo})` : ''}
                </span>
                <Badge bg="secondary">Cantidad {normalizarNumero(nodo.cantidad)}</Badge>
                {!readOnly && ingredientesPendientes.length > 0 && (
                    <Button
                        size="sm"
                        variant="outline-success"
                        onClick={() => {
                            onExpedirNodo(nodo);
                        }}>
                        Expedir todo
                    </Button>
                )}
                {!readOnly && ingredientesMarcados.length > 0 && (
                    <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => {
                            onDesmarcarNodo(nodo);
                        }}>
                        Desmarcar todo
                    </Button>
                )}
            </div>

            {nodo.ingredientes.length === 0 ? (
                <Alert variant="warning" className="mb-3">
                    Este PT no tiene renglones de receta.
                </Alert>
            ) : (
                <Table responsive hover className="mb-3 align-middle">
                    <thead>
                        <tr>
                            <th></th>
                            <th>Código</th>
                            <th>Ingrediente</th>
                            <th>Tipo</th>
                            <th>Unidad</th>
                            <th>Porción Bruta</th>
                        </tr>
                    </thead>
                    <tbody>
                        {nodo.ingredientes.map((ingrediente) => (
                            <tr
                                key={`${ingrediente.codigo}-${ingrediente.subCodigo}`}>
                                <td>
                                    <Form.Check
                                        checked={ingrediente.check}
                                        disabled={
                                            readOnly || !ingrediente.puedeExpedir
                                        }
                                        onChange={(event) => {
                                            onToggleIngrediente(
                                                event.target.checked,
                                                ingrediente.codigo,
                                                ingrediente.subCodigo,
                                            );
                                        }}
                                    />
                                </td>
                                <td>{ingrediente.subCodigo || '-'}</td>
                                <td>{ingrediente.descripcion}</td>
                                <td>
                                    <Badge
                                        bg={
                                            ingrediente.tipo === 'PT'
                                                ? 'warning'
                                                : 'info'
                                        }
                                        text={
                                            ingrediente.tipo === 'PT'
                                                ? 'dark'
                                                : undefined
                                        }>
                                        {ingrediente.tipo}
                                    </Badge>
                                </td>
                                <td>{ingrediente.unidadMedida}</td>
                                <td>{normalizarNumero(ingrediente.porcionBruta)}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

            {nodo.subrecetas.length > 0 && (
                <Accordion alwaysOpen>
                    {nodo.subrecetas.map((subreceta) => (
                        <Accordion.Item
                            eventKey={`${subreceta.codigo}-${subreceta.nombre}`}
                            key={`${subreceta.codigo}-${subreceta.nombre}`}>
                            <Accordion.Header>
                                Subreceta: {subreceta.nombre}
                                {subreceta.codigo ? ` (${subreceta.codigo})` : ''}
                            </Accordion.Header>
                            <Accordion.Body>
                                <RecetaNodoTabla
                                    nodo={subreceta}
                                    onToggleIngrediente={onToggleIngrediente}
                                    onExpedirNodo={onExpedirNodo}
                                    onDesmarcarNodo={onDesmarcarNodo}
                                    readOnly={readOnly}
                                />
                            </Accordion.Body>
                        </Accordion.Item>
                    ))}
                </Accordion>
            )}
        </>
    );
}

export function ExpedicionRecetaModal({
    comandaId,
    plato,
    readOnly,
    show,
    onClose,
    onResumenActualizado,
}: ExpedicionRecetaModalProps) {
    const [detalle, setDetalle] = useState<ExpedicionRecetaDetalle | null>(null);
    const [loading, setLoading] = useState(false);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!show || !comandaId || !plato) {
            setDetalle(null);
            setLoading(false);
            setSavingKey(null);
            setError(null);
            return;
        }

        const abortController = new AbortController();

        setLoading(true);
        setSavingKey(null);
        setError(null);
        setDetalle(null);

        fetch(
            `/api/exEvento/receta?comandaId=${comandaId}&platoId=${plato.platoId}`,
            {
                signal: abortController.signal,
            },
        )
            .then((response) => {
                if (!response.ok) {
                    throw new Error('No se pudo cargar la receta del PT.');
                }

                return response.json();
            })
            .then((data: ExpedicionRecetaDetalle) => {
                setDetalle(data);
            })
            .catch((fetchError: unknown) => {
                if (
                    fetchError instanceof Error &&
                    fetchError.name === 'AbortError'
                ) {
                    return;
                }

                console.error('Error fetching recipe details:', fetchError);
                setError('No se pudo cargar la receta del PT.');
            })
            .finally(() => {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => {
            abortController.abort();
        };
    }, [comandaId, plato, show]);

    const resumenActual = useMemo(
        () => resumirNodoReceta(detalle?.recetaDirecta ?? null),
        [detalle],
    );

    const toggleIngrediente = async (
        checked: boolean,
        codigo: string,
        subCodigo: string,
    ) => {
        if (!comandaId || !detalle?.recetaDirecta) {
            return;
        }

        const clave = `${codigo}|||${subCodigo}`;
        setSavingKey(clave);
        setError(null);

        try {
            const response = await fetch('/api/exEvento', {
                method: checked ? 'POST' : 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    comandaId,
                    codigo,
                    subCodigo,
                }),
            });

            if (!response.ok) {
                throw new Error('No se pudo actualizar el ingrediente.');
            }

            const recetaActualizada = actualizarCheckEnNodo(
                detalle.recetaDirecta,
                codigo,
                subCodigo,
                checked,
            );
            const resumenActualizado = resumirNodoReceta(recetaActualizada);

            setDetalle((actual) => {
                if (!actual?.recetaDirecta) {
                    return actual;
                }

                return {
                    ...actual,
                    recetaDirecta: recetaActualizada,
                    resumen: resumenActualizado,
                };
            });

            onResumenActualizado(detalle.plato.id, resumenActualizado);
        } catch (toggleError) {
            console.error('Error updating expedition ingredient:', toggleError);
            setError('No se pudo actualizar el estado del ingrediente.');
        } finally {
            setSavingKey(null);
        }
    };

    const actualizarNodoCompleto = async (
        nodo: ExpedicionRecetaNodo,
        checked: boolean,
    ) => {
        if (!comandaId || !detalle?.recetaDirecta) {
            return;
        }

        const ingredientesObjetivo = checked
            ? obtenerIngredientesPendientesNodo(nodo)
            : obtenerIngredientesMarcadosNodo(nodo);

        if (ingredientesObjetivo.length === 0) {
            return;
        }

        setSavingKey(
            `${checked ? 'bulk' : 'unbulk'}:${nodo.codigo || nodo.nombre}`,
        );
        setError(null);

        try {
            await Promise.all(
                ingredientesObjetivo.map((ingrediente) =>
                    fetch('/api/exEvento', {
                        method: checked ? 'POST' : 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            comandaId,
                            codigo: ingrediente.codigo,
                            subCodigo: ingrediente.subCodigo,
                        }),
                    }).then((response) => {
                        if (!response.ok) {
                            throw new Error(
                                checked
                                    ? 'No se pudieron expedir todos los ingredientes.'
                                    : 'No se pudieron desmarcar todos los ingredientes.',
                            );
                        }
                    }),
                ),
            );

            const recetaActualizada = actualizarChecksEnLote(
                detalle.recetaDirecta,
                ingredientesObjetivo,
                checked,
            );
            const resumenActualizado = resumirNodoReceta(recetaActualizada);

            setDetalle((actual) => {
                if (!actual?.recetaDirecta) {
                    return actual;
                }

                return {
                    ...actual,
                    recetaDirecta: recetaActualizada,
                    resumen: resumenActualizado,
                };
            });

            onResumenActualizado(detalle.plato.id, resumenActualizado);
        } catch (bulkError) {
            console.error('Error updating expedition node:', bulkError);
            setError(
                checked
                    ? 'No se pudo expedir todo el PT o la subreceta.'
                    : 'No se pudo desmarcar todo el PT o la subreceta.',
            );
        } finally {
            setSavingKey(null);
        }
    };

    return (
        <Modal
            centered
            scrollable
            size="xl"
            show={show}
            onHide={onClose}>
            <Modal.Header closeButton>
                <Modal.Title>
                    {loading ? (
                        <Placeholder
                            as="span"
                            animation="glow"
                            className="d-inline-block"
                            style={{ width: '16rem' }}>
                            <Placeholder xs={12} />
                        </Placeholder>
                    ) : (
                        detalle?.plato.nombre ||
                        plato?.nombre ||
                        'Receta del PT'
                    )}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}

                {loading ? (
                    <Placeholder animation="glow" as="div">
                        <Placeholder xs={12} className="mb-2" />
                        <Placeholder xs={8} className="mb-2" />
                        <Placeholder xs={10} className="mb-2" />
                    </Placeholder>
                ) : !detalle ? (
                    <Alert variant="warning">No se encontró el PT seleccionado.</Alert>
                ) : (
                    <>
                        <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                            <Badge bg="dark">
                                {detalle.plato.codigo || 'Sin código'}
                            </Badge>
                            <Badge bg="secondary">
                                Cantidad {normalizarNumero(detalle.plato.cantidad)}
                            </Badge>
                            <Badge bg="success">
                                Expedidos {resumenActual.ingredientesExpedidos}/
                                {resumenActual.ingredientesTotales}
                            </Badge>
                            {savingKey && (
                                <Badge bg="warning" text="dark">
                                    Guardando...
                                </Badge>
                            )}
                        </div>

                        {detalle.recetaDirecta ? (
                            <RecetaNodoTabla
                                nodo={detalle.recetaDirecta}
                                onToggleIngrediente={toggleIngrediente}
                                onExpedirNodo={(nodo) => {
                                    void actualizarNodoCompleto(nodo, true);
                                }}
                                onDesmarcarNodo={(nodo) => {
                                    void actualizarNodoCompleto(nodo, false);
                                }}
                                readOnly={readOnly}
                            />
                        ) : (
                            <Alert variant="warning" className="mb-0">
                                Este PT no tiene receta cargada.
                            </Alert>
                        )}
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
