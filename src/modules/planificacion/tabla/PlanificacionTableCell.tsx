'use client';

import { Form } from 'react-bootstrap';
import type { CSSProperties, DragEvent } from 'react';
import type {
    CeldaPlanificacionModel,
    DragCantidadPayload,
    GuardarEdicionCeldaInput,
} from './planificacionTable.shared';

export function PlanificacionTableCell({
    canEdit,
    celda,
    celdaEditando,
    cerrarEdicionCelda,
    guardarEdicionCelda,
    handleDragOverInputCantidad,
    handleDropInputCantidad,
    iniciarDragCantidad,
    iniciarEdicionCelda,
    plato,
    platoCodigo,
    platoPadre,
    platoPadreCodigo,
    setValorCeldaEditando,
    styleCeldaDia,
    valorCeldaEditando,
}: {
    canEdit: boolean;
    celda: CeldaPlanificacionModel;
    celdaEditando: string | null;
    cerrarEdicionCelda: () => void;
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
    plato: string;
    platoCodigo: string;
    platoPadre: string;
    platoPadreCodigo: string;
    setValorCeldaEditando: (value: string) => void;
    styleCeldaDia: CSSProperties;
    valorCeldaEditando: string;
}) {
    const badgeDerecho = celda.badgeDerecho;
    const estaEditando = celdaEditando === celda.cellKey;
    const mostrarPlaceholder =
        !badgeDerecho && celda.valorInput === '' && celda.totalConsumo > 0;
    const textoDisplay =
        celda.valorInput === ''
            ? mostrarPlaceholder
                ? celda.totalConsumo.toString()
                : '\u00A0'
            : String(celda.valorInput);
    const classNameDisplay = [
        'planificacion-celda-display',
        mostrarPlaceholder ? 'planificacion-celda-display-placeholder' : '',
        celda.updateCant ? 'planificacion-celda-display-pending' : '',
        celda.placeholderArrastrable
            ? 'planificacion-celda-display-draggable'
            : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <td style={styleCeldaDia}>
            <div
                className={
                    badgeDerecho ? 'planificacion-celda-con-badge' : undefined
                }>
                {estaEditando ? (
                    <Form.Control
                        type="number"
                        autoFocus
                        disabled={!canEdit}
                        style={{
                            width: '100%',
                            color: celda.updateCant ? '#ff0000' : undefined,
                        }}
                        className="form-control form-control-sm input"
                        value={valorCeldaEditando}
                        placeholder={
                            !badgeDerecho && celda.totalConsumo
                                ? celda.totalConsumo.toString()
                                : ''
                        }
                        step={0.1}
                        min={0}
                        onDragOver={(event) => {
                            handleDragOverInputCantidad(event, {
                                platoCodigo,
                                platoPadreCodigo,
                            });
                        }}
                        onDrop={(event) => {
                            handleDropInputCantidad(event, {
                                cantidadActual: valorCeldaEditando,
                                fecha: celda.fechaClave,
                                plato,
                                platoCodigo,
                                platoPadre,
                                platoPadreCodigo,
                            });
                        }}
                        onChange={(event) => {
                            setValorCeldaEditando(event.target.value);
                        }}
                        onBlur={() => {
                            guardarEdicionCelda({
                                celdaKey: celda.cellKey,
                                fecha: celda.fechaClave,
                                plato,
                                platoCodigo,
                                platoPadre,
                                platoPadreCodigo,
                            });
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                guardarEdicionCelda({
                                    celdaKey: celda.cellKey,
                                    fecha: celda.fechaClave,
                                    plato,
                                    platoCodigo,
                                    platoPadre,
                                    platoPadreCodigo,
                                });
                            }

                            if (event.key === 'Escape') {
                                cerrarEdicionCelda();
                            }
                        }}
                    />
                ) : !canEdit ? (
                    <div
                        className={classNameDisplay}
                        onDragOver={(event) => {
                            handleDragOverInputCantidad(event, {
                                platoCodigo,
                                platoPadreCodigo,
                            });
                        }}
                        onDrop={(event) => {
                            handleDropInputCantidad(event, {
                                cantidadActual: celda.valorInput,
                                fecha: celda.fechaClave,
                                plato,
                                platoCodigo,
                                platoPadre,
                                platoPadreCodigo,
                            });
                        }}>
                        {textoDisplay}
                    </div>
                ) : (
                    <button
                        type="button"
                        className={classNameDisplay}
                        draggable={celda.placeholderArrastrable}
                        onClick={() => {
                            iniciarEdicionCelda(celda.cellKey, celda.valorInput);
                        }}
                        onDragStart={(event) => {
                            if (!celda.placeholderArrastrable) {
                                return;
                            }

                            iniciarDragCantidad(event, {
                                mode: 'add',
                                platoCodigo,
                                platoPadreCodigo,
                                value: celda.totalConsumo,
                            });
                        }}
                        onDragOver={(event) => {
                            handleDragOverInputCantidad(event, {
                                platoCodigo,
                                platoPadreCodigo,
                            });
                        }}
                        onDrop={(event) => {
                            handleDropInputCantidad(event, {
                                cantidadActual: celda.valorInput,
                                fecha: celda.fechaClave,
                                plato,
                                platoCodigo,
                                platoPadre,
                                platoPadreCodigo,
                            });
                        }}
                        title={
                            celda.placeholderArrastrable
                                ? 'Arrastrá este valor para sumarlo en otra celda de la misma fila'
                                : undefined
                        }>
                        {textoDisplay}
                    </button>
                )}
                {badgeDerecho && (
                    <span
                        draggable={badgeDerecho.draggable === true}
                        className={`${badgeDerecho.className}${
                            badgeDerecho.draggable
                                ? ' planificacion-badge-arrastrable'
                                : ''
                        }`}
                        onDragStart={(event) => {
                            const dragValue = badgeDerecho.value;

                            if (
                                badgeDerecho.draggable !== true ||
                                dragValue === undefined ||
                                !Number.isFinite(dragValue)
                            ) {
                                return;
                            }

                            iniciarDragCantidad(event, {
                                mode: 'add',
                                platoCodigo,
                                platoPadreCodigo,
                                value: dragValue,
                            });
                        }}
                        title={
                            badgeDerecho.draggable
                                ? 'Arrastrá este valor para sumarlo en otra celda de la misma fila'
                                : badgeDerecho.title
                        }>
                        {badgeDerecho.texto}
                    </span>
                )}
            </div>
        </td>
    );
}
