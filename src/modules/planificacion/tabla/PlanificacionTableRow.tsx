'use client';

import { Button } from 'react-bootstrap';
import { ChatRightText } from 'react-bootstrap-icons';
import type {
    CSSProperties,
    DragEvent,
    FocusEvent,
    MouseEvent,
} from 'react';
import { PlanificacionTableCell } from './PlanificacionTableCell';
import type {
    DragCantidadPayload,
    FilaPlanificacionModel,
    GuardarEdicionCeldaInput,
    StyleStickyFn,
} from './planificacionTable.shared';

export function PlanificacionTableRow({
    canEdit,
    celdaEditando,
    cerrarEdicionCelda,
    fila,
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
}: {
    canEdit: boolean;
    celdaEditando: string | null;
    cerrarEdicionCelda: () => void;
    fila: FilaPlanificacionModel;
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
    iniciarEdicionCelda: (celdaKey: string, valorActual: number | string) => void;
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
}) {
    return (
        <tr style={{ textAlign: 'center' }}>
            <td
                style={obtenerStyleStickyIzquierda(0, fila.rowBackgroundColor, {
                    textAlign: 'center',
                })}>
                <Button
                    size="sm"
                    variant="outline-primary"
                    style={{
                        width: '2rem',
                        height: '2.2rem',
                    }}
                    onClick={() => {
                        onOpenObservation(fila);
                    }}>
                    <ChatRightText />
                </Button>
            </td>
            <td
                style={obtenerStyleStickyIzquierda(1, fila.rowBackgroundColor, {
                    overflow: 'visible',
                    textOverflow: 'clip',
                })}>
                <span
                    className="planificacion-tooltip-target"
                    style={obtenerStyleTextoSticky(1)}
                    tabIndex={0}
                    onMouseEnter={(event) => {
                        mostrarTooltipCompartido(event, fila.platoPadre);
                    }}
                    onFocus={(event) => {
                        mostrarTooltipCompartido(event, fila.platoPadre);
                    }}
                    onMouseLeave={ocultarTooltipCompartido}
                    onBlur={ocultarTooltipCompartido}>
                    {fila.platoPadre}
                </span>
            </td>
            <td
                style={obtenerStyleStickyIzquierda(2, fila.rowBackgroundColor, {
                    overflow: 'visible',
                    textOverflow: 'clip',
                })}>
                <span
                    className="planificacion-tooltip-target"
                    style={obtenerStyleTextoSticky(2)}
                    tabIndex={0}
                    onMouseEnter={(event) => {
                        mostrarTooltipCompartido(event, fila.plato);
                    }}
                    onFocus={(event) => {
                        mostrarTooltipCompartido(event, fila.plato);
                    }}
                    onMouseLeave={ocultarTooltipCompartido}
                    onBlur={ocultarTooltipCompartido}>
                    {fila.plato}
                </span>
            </td>
            <td
                className={fila.claseColorTotal}
                style={obtenerStyleStickyIzquierda(3, fila.rowBackgroundColor, {
                    textAlign: 'center',
                })}>
                <span
                    draggable={canEdit}
                    onDragStart={(event) => {
                        iniciarDragCantidad(event, {
                            mode: 'set',
                            platoCodigo: fila.platoCodigo,
                            platoPadreCodigo: fila.platoPadreCodigo,
                            value: fila.totalNecesario,
                        });
                    }}
                    style={{
                        cursor: canEdit ? 'grab' : 'default',
                        userSelect: 'none',
                    }}
                    title={
                        canEdit
                            ? 'Arrastrá para pegar este total en una celda de la misma fila'
                            : undefined
                    }>
                    {fila.totalNecesario.toFixed(2)}
                </span>
            </td>
            {fila.cells.map((celda) => (
                <PlanificacionTableCell
                    key={`${fila.rowKey}-${celda.fechaClave}`}
                    canEdit={canEdit}
                    celda={celda}
                    celdaEditando={celdaEditando}
                    cerrarEdicionCelda={cerrarEdicionCelda}
                    guardarEdicionCelda={guardarEdicionCelda}
                    handleDragOverInputCantidad={handleDragOverInputCantidad}
                    handleDropInputCantidad={handleDropInputCantidad}
                    iniciarDragCantidad={iniciarDragCantidad}
                    iniciarEdicionCelda={iniciarEdicionCelda}
                    plato={fila.plato}
                    platoCodigo={fila.platoCodigo}
                    platoPadre={fila.platoPadre}
                    platoPadreCodigo={fila.platoPadreCodigo}
                    setValorCeldaEditando={setValorCeldaEditando}
                    styleCeldaDia={styleCeldaDia}
                    valorCeldaEditando={valorCeldaEditando}
                />
            ))}
        </tr>
    );
}
