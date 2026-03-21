'use client';

import { formatearDiaTabla } from '@/lib/formatearDiaTabla';
import { Button, Form } from 'react-bootstrap';
import { ArrowsFullscreen, FullscreenExit } from 'react-bootstrap-icons';
import type { EventoPlanificacion } from '@/modules/planificacion/types';
import {
    STICKY_COLUMN_WIDTHS,
    abreviar,
    type DiaVisible,
    type OpcionFiltro,
    type StyleHeaderDiaFn,
    type StyleHeaderStickyFn,
} from './planificacionTable.shared';

export function PlanificacionTableHeader({
    canEdit,
    cantidadFilasCabeceraSuperior,
    diasVisibles,
    eventosPorFecha,
    filtroElaboracion,
    filtroPlato,
    indiceFilaTitulos,
    isFullscreen,
    limpiandoFiltros,
    onAbrirAdelantoEvento,
    onFiltroElaboracionChange,
    onFiltroPlatoChange,
    onLimpiarFiltros,
    onToggleFullscreen,
    obtenerStyleHeaderDia,
    obtenerStyleHeaderStickyIzquierda,
    opcionesElaboracion,
    opcionesPlato,
}: {
    canEdit: boolean;
    cantidadFilasCabeceraSuperior: number;
    diasVisibles: DiaVisible[];
    eventosPorFecha: Map<string, EventoPlanificacion[]>;
    filtroElaboracion: string;
    filtroPlato: string;
    indiceFilaTitulos: number;
    isFullscreen: boolean;
    limpiandoFiltros: boolean;
    onAbrirAdelantoEvento: (eventoId: number) => void;
    onFiltroElaboracionChange: (value: string) => void;
    onFiltroPlatoChange: (value: string) => void;
    onLimpiarFiltros: () => void;
    onToggleFullscreen: () => void | Promise<void>;
    obtenerStyleHeaderDia: StyleHeaderDiaFn;
    obtenerStyleHeaderStickyIzquierda: StyleHeaderStickyFn;
    opcionesElaboracion: OpcionFiltro[];
    opcionesPlato: OpcionFiltro[];
}) {
    return (
        <thead>
            {Array.from({
                length: cantidadFilasCabeceraSuperior,
            }).map((_, headerIndex) => (
                <tr key={`evento-header-${headerIndex}`}>
                    {STICKY_COLUMN_WIDTHS.map((_, columnIndex) => {
                        const esFilaFiltros =
                            headerIndex === cantidadFilasCabeceraSuperior - 1;
                        const key = `evento-header-empty-${headerIndex}-${columnIndex}`;
                        const style = obtenerStyleHeaderStickyIzquierda(
                            columnIndex,
                            headerIndex,
                            '#ffffff',
                            {
                                border: 'none',
                            },
                        );

                        if (
                            esFilaFiltros &&
                            (columnIndex === 1 || columnIndex === 2)
                        ) {
                            return (
                                <th
                                    key={key}
                                    className="planificacion-header-filtro-cell"
                                    style={style}>
                                    <Form.Select
                                        size="sm"
                                        disabled={limpiandoFiltros}
                                        value={
                                            columnIndex === 1
                                                ? filtroPlato
                                                : filtroElaboracion
                                        }
                                        onChange={(event) => {
                                            const { value } = event.target;

                                            if (columnIndex === 1) {
                                                onFiltroPlatoChange(value);
                                                return;
                                            }

                                            onFiltroElaboracionChange(value);
                                        }}
                                        aria-label={
                                            columnIndex === 1
                                                ? 'Seleccionar plato'
                                                : 'Seleccionar elaboración'
                                        }
                                        className="planificacion-header-filtro">
                                        <option
                                            value=""
                                            disabled
                                            hidden>
                                            {columnIndex === 1
                                                ? 'Seleccionar plato'
                                                : 'Seleccionar elaboración'}
                                        </option>
                                        {(columnIndex === 1
                                            ? opcionesPlato
                                            : opcionesElaboracion
                                        ).map((opcion) => (
                                            <option
                                                key={opcion.value}
                                                value={opcion.value}>
                                                {opcion.label}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </th>
                            );
                        }

                        if (esFilaFiltros && columnIndex === 3) {
                            return (
                                <th
                                    key={key}
                                    className="planificacion-header-filtro-cell"
                                    style={style}>
                                    <Button
                                        size="sm"
                                        variant="outline-secondary"
                                        onClick={onLimpiarFiltros}
                                        disabled={
                                            limpiandoFiltros ||
                                            (!filtroPlato &&
                                                !filtroElaboracion)
                                        }>
                                        Limpiar
                                    </Button>
                                </th>
                            );
                        }

                        return (
                            <th
                                key={key}
                                style={style}>
                                &nbsp;
                            </th>
                        );
                    })}
                    {diasVisibles.map(({ fechaClave, indexOriginal }) => {
                        const eventosDia = eventosPorFecha.get(fechaClave) ?? [];
                        const offset =
                            cantidadFilasCabeceraSuperior - eventosDia.length;
                        const eventoIndex = headerIndex - offset;
                        const evento =
                            eventoIndex >= 0
                                ? (eventosDia[eventoIndex] ?? null)
                                : null;

                        return (
                            <th
                                key={`evento-header-${indexOriginal}-${headerIndex}`}
                                className={evento ? 'link-pdf' : undefined}
                                onClick={() => {
                                    if (!evento || !canEdit) {
                                        return;
                                    }

                                    onAbrirAdelantoEvento(evento.id);
                                }}
                                style={obtenerStyleHeaderDia(
                                    headerIndex,
                                    '#ffffff',
                                    {
                                        border: 'none',
                                        fontWeight: 'normal',
                                    },
                                )}>
                                {evento
                                    ? `${abreviar(evento.lugar)} - ${evento.cantidadInvitados}`
                                    : '\u00A0'}
                            </th>
                        );
                    })}
                </tr>
            ))}
            <tr style={{ textAlign: 'center' }}>
                <th
                    style={obtenerStyleHeaderStickyIzquierda(
                        0,
                        indiceFilaTitulos,
                        '#BDBDBD',
                    )}>
                    <Button
                        size="sm"
                        variant="outline-dark"
                        onClick={() => {
                            void onToggleFullscreen();
                        }}
                        title={
                            isFullscreen
                                ? 'Salir de pantalla completa'
                                : 'Ver en pantalla completa'
                        }
                        aria-label={
                            isFullscreen
                                ? 'Salir de pantalla completa'
                                : 'Ver en pantalla completa'
                        }
                        style={{
                            width: '2rem',
                            height: '1.5rem',
                            display: 'inline-flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '0.75rem',
                            padding: 0,
                        }}>
                        {isFullscreen ? <FullscreenExit /> : <ArrowsFullscreen />}
                    </Button>
                </th>
                <th
                    style={obtenerStyleHeaderStickyIzquierda(
                        1,
                        indiceFilaTitulos,
                        '#BDBDBD',
                    )}>
                    Plato
                </th>
                <th
                    style={obtenerStyleHeaderStickyIzquierda(
                        2,
                        indiceFilaTitulos,
                        '#BDBDBD',
                    )}>
                    Elaboracion
                </th>
                <th
                    style={obtenerStyleHeaderStickyIzquierda(
                        3,
                        indiceFilaTitulos,
                        '#BDBDBD',
                    )}>
                    Total
                </th>
                {diasVisibles.map(({ dia, indexOriginal, fechaClave }) => (
                    <th
                        key={fechaClave}
                        style={obtenerStyleHeaderDia(
                            indiceFilaTitulos,
                            indexOriginal < 11 ? 'rgb(255, 255, 0)' : '#BDBDBD',
                            {
                                fontWeight: 700,
                                textAlign: 'center',
                            },
                        )}>
                        {formatearDiaTabla(dia)}
                    </th>
                ))}
            </tr>
        </thead>
    );
}
