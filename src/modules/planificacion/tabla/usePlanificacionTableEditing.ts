'use client';

import { useCallback, useState } from 'react';
import type { DragEvent, Dispatch, SetStateAction } from 'react';
import type { ProduccionChange } from '@/modules/planificacion/types';
import type {
    DragCantidadPayload,
    GuardarEdicionCeldaInput,
} from './planificacionTable.shared';

const DRAG_CANTIDAD_MIME = 'application/x-tamiz-planificacion-cantidad';

export function usePlanificacionTableEditing({
    canEdit,
    setProduccionUpdate,
}: {
    canEdit: boolean;
    setProduccionUpdate: Dispatch<SetStateAction<ProduccionChange[]>>;
}) {
    const [celdaEditando, setCeldaEditando] = useState<string | null>(null);
    const [valorCeldaEditando, setValorCeldaEditando] = useState('');

    const actualizarProduccionCelda = useCallback(
        (
            plato: string,
            platoCodigo: string,
            platoPadre: string,
            platoPadreCodigo: string,
            fecha: string,
            valorInput: string,
        ) => {
            setProduccionUpdate((prevProduccion) => {
                const nuevaProduccion = [...prevProduccion];
                const index = nuevaProduccion.findIndex(
                    (item) =>
                        item.platoCodigo === platoCodigo &&
                        item.platoPadreCodigo === platoPadreCodigo &&
                        item.fecha === fecha,
                );

                if (valorInput === '') {
                    const valorEliminado: ProduccionChange = {
                        cantidad: null,
                        eliminar: true,
                        fecha,
                        plato,
                        platoCodigo,
                        platoPadre,
                        platoPadreCodigo,
                    };

                    if (index > -1) {
                        nuevaProduccion[index] = valorEliminado;
                    } else {
                        nuevaProduccion.push(valorEliminado);
                    }

                    return nuevaProduccion;
                }

                const cantidad = Number.parseFloat(
                    valorInput.replace(',', '.'),
                );

                if (!Number.isFinite(cantidad)) {
                    return prevProduccion;
                }

                const valorActualizado: ProduccionChange = {
                    cantidad: Number(cantidad.toFixed(2)),
                    eliminar: false,
                    fecha,
                    plato,
                    platoCodigo,
                    platoPadre,
                    platoPadreCodigo,
                };

                if (index > -1) {
                    nuevaProduccion[index] = valorActualizado;
                } else {
                    nuevaProduccion.push(valorActualizado);
                }

                return nuevaProduccion;
            });
        },
        [setProduccionUpdate],
    );

    const iniciarEdicionCelda = useCallback(
        (celdaKey: string, valorActual: number | string) => {
            if (!canEdit) {
                return;
            }

            setCeldaEditando(celdaKey);
            setValorCeldaEditando(
                valorActual === '' ? '' : String(valorActual),
            );
        },
        [canEdit],
    );

    const cerrarEdicionCelda = useCallback(() => {
        setCeldaEditando(null);
        setValorCeldaEditando('');
    }, []);

    const guardarEdicionCelda = useCallback(
        ({
            celdaKey,
            fecha,
            plato,
            platoCodigo,
            platoPadre,
            platoPadreCodigo,
        }: GuardarEdicionCeldaInput) => {
            actualizarProduccionCelda(
                plato,
                platoCodigo,
                platoPadre,
                platoPadreCodigo,
                fecha,
                valorCeldaEditando,
            );

            if (celdaEditando === celdaKey) {
                cerrarEdicionCelda();
            }
        },
        [
            actualizarProduccionCelda,
            celdaEditando,
            cerrarEdicionCelda,
            valorCeldaEditando,
        ],
    );

    const iniciarDragCantidad = useCallback(
        (event: DragEvent<HTMLElement>, payload: DragCantidadPayload) => {
            if (!Number.isFinite(payload.value)) {
                return;
            }

            const value = Number(payload.value.toFixed(2));
            const payloadNormalizado: DragCantidadPayload = {
                mode: payload.mode,
                platoCodigo: payload.platoCodigo,
                platoPadreCodigo: payload.platoPadreCodigo,
                value,
            };

            event.dataTransfer.setData(
                DRAG_CANTIDAD_MIME,
                JSON.stringify(payloadNormalizado),
            );
            event.dataTransfer.setData('text/plain', String(value));
            event.dataTransfer.effectAllowed = 'copy';
        },
        [],
    );

    const obtenerDragCantidad = useCallback((dataTransfer: DataTransfer) => {
        const dataCustom = dataTransfer.getData(DRAG_CANTIDAD_MIME);

        if (dataCustom) {
            try {
                const payload = JSON.parse(
                    dataCustom,
                ) as Partial<DragCantidadPayload>;
                const mode = payload.mode;
                const value = Number(payload.value);
                const platoCodigo = String(payload.platoCodigo || '');
                const platoPadreCodigo = String(payload.platoPadreCodigo || '');

                if (
                    (mode === 'set' || mode === 'add') &&
                    Number.isFinite(value) &&
                    platoCodigo &&
                    platoPadreCodigo
                ) {
                    return {
                        mode,
                        platoCodigo,
                        platoPadreCodigo,
                        value,
                    } satisfies DragCantidadPayload;
                }
            } catch {}
        }

        return null;
    }, []);

    const esMismaFilaDrag = useCallback(
        (
            payload: DragCantidadPayload,
            {
                platoCodigo,
                platoPadreCodigo,
            }: {
                platoCodigo: string;
                platoPadreCodigo: string;
            },
        ) =>
            payload.platoCodigo === platoCodigo &&
            payload.platoPadreCodigo === platoPadreCodigo,
        [],
    );

    const handleDragOverInputCantidad = useCallback(
        (
            event: DragEvent<HTMLElement>,
            {
                platoCodigo,
                platoPadreCodigo,
            }: {
                platoCodigo: string;
                platoPadreCodigo: string;
            },
        ) => {
            if (!canEdit) {
                return;
            }

            const tipos = Array.from(event.dataTransfer.types || []);
            const esDragCompatible = tipos.includes(DRAG_CANTIDAD_MIME);

            if (!esDragCompatible) {
                return;
            }

            const payload = obtenerDragCantidad(event.dataTransfer);
            if (
                payload &&
                !esMismaFilaDrag(payload, {
                    platoCodigo,
                    platoPadreCodigo,
                })
            ) {
                return;
            }

            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
        },
        [canEdit, esMismaFilaDrag, obtenerDragCantidad],
    );

    const handleDropInputCantidad = useCallback(
        (
            event: DragEvent<HTMLElement>,
            {
                cantidadActual,
                fecha,
                plato,
                platoCodigo,
                platoPadre,
                platoPadreCodigo,
            }: {
                cantidadActual: number | string;
                fecha: string;
                plato: string;
                platoCodigo: string;
                platoPadre: string;
                platoPadreCodigo: string;
            },
        ) => {
            if (!canEdit) {
                return;
            }

            const payload = obtenerDragCantidad(event.dataTransfer);

            if (!payload) {
                return;
            }

            event.preventDefault();

            if (
                !esMismaFilaDrag(payload, {
                    platoCodigo,
                    platoPadreCodigo,
                })
            ) {
                return;
            }

            const actual = Number(cantidadActual);
            const actualValido = Number.isFinite(actual) ? actual : null;
            const nuevoValor =
                payload.mode === 'add'
                    ? Number(((actualValido ?? 0) + payload.value).toFixed(2))
                    : Number(payload.value.toFixed(2));

            actualizarProduccionCelda(
                plato,
                platoCodigo,
                platoPadre,
                platoPadreCodigo,
                fecha,
                nuevoValor.toString(),
            );
        },
        [
            actualizarProduccionCelda,
            canEdit,
            esMismaFilaDrag,
            obtenerDragCantidad,
        ],
    );

    return {
        celdaEditando,
        cerrarEdicionCelda,
        guardarEdicionCelda,
        handleDragOverInputCantidad,
        handleDropInputCantidad,
        iniciarDragCantidad,
        iniciarEdicionCelda,
        setValorCeldaEditando,
        valorCeldaEditando,
    };
}
