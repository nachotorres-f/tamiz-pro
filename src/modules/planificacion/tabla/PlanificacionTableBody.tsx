'use client';

import type {
    CSSProperties,
    DragEvent,
    FocusEvent,
    MouseEvent,
} from 'react';
import type {
    DragCantidadPayload,
    FilaPlanificacionModel,
    GuardarEdicionCeldaInput,
    StyleStickyFn,
} from './planificacionTable.shared';
import { PlanificacionTableRow } from './PlanificacionTableRow';

export function PlanificacionTableBody({
    canEdit,
    celdaEditando,
    filas,
    guardarEdicionCelda,
    handleDragOverInputCantidad,
    handleDropInputCantidad,
    iniciarDragCantidad,
    iniciarEdicionCelda,
    mostrarTooltipCompartido,
    obtenerStyleStickyIzquierda,
    obtenerStyleTextoSticky,
    ocultarTooltipCompartido,
    onOpenObservation,
    setValorCeldaEditando,
    styleCeldaDia,
    valorCeldaEditando,
    cerrarEdicionCelda,
}: {
    canEdit: boolean;
    celdaEditando: string | null;
    filas: FilaPlanificacionModel[];
    guardarEdicionCelda: (input: GuardarEdicionCeldaInput) => void;
    handleDragOverInputCantidad: (
        event: DragEvent<HTMLElement>,
        input: {
            platoCodigo: string;
            platoPadreCodigo: string;
        },
    ) => void;
    handleDropInputCantidad: (
        event: DragEvent<HTMLElement>,
        input: {
            cantidadActual: number | string;
            fecha: string;
            plato: string;
            platoCodigo: string;
            platoPadre: string;
            platoPadreCodigo: string;
        },
    ) => void;
    iniciarDragCantidad: (
        event: DragEvent<HTMLElement>,
        payload: DragCantidadPayload,
    ) => void;
    iniciarEdicionCelda: (
        celdaKey: string,
        valorActual: number | string,
    ) => void;
    mostrarTooltipCompartido: (
        event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>,
        text: string,
    ) => void;
    obtenerStyleStickyIzquierda: StyleStickyFn;
    obtenerStyleTextoSticky: (columnIndex: number) => CSSProperties;
    ocultarTooltipCompartido: () => void;
    onOpenObservation: (fila: FilaPlanificacionModel) => void;
    setValorCeldaEditando: (value: string) => void;
    styleCeldaDia: CSSProperties;
    valorCeldaEditando: string;
    cerrarEdicionCelda: () => void;
}) {
    return (
        <tbody>
            {filas.map((fila) => (
                <PlanificacionTableRow
                    key={fila.rowKey}
                    canEdit={canEdit}
                    celdaEditando={celdaEditando}
                    cerrarEdicionCelda={cerrarEdicionCelda}
                    fila={fila}
                    guardarEdicionCelda={guardarEdicionCelda}
                    handleDragOverInputCantidad={handleDragOverInputCantidad}
                    handleDropInputCantidad={handleDropInputCantidad}
                    iniciarDragCantidad={iniciarDragCantidad}
                    iniciarEdicionCelda={iniciarEdicionCelda}
                    mostrarTooltipCompartido={mostrarTooltipCompartido}
                    obtenerStyleStickyIzquierda={obtenerStyleStickyIzquierda}
                    obtenerStyleTextoSticky={obtenerStyleTextoSticky}
                    ocultarTooltipCompartido={ocultarTooltipCompartido}
                    onOpenObservation={onOpenObservation}
                    setValorCeldaEditando={setValorCeldaEditando}
                    styleCeldaDia={styleCeldaDia}
                    valorCeldaEditando={valorCeldaEditando}
                />
            ))}
        </tbody>
    );
}
