'use client';

import React, {
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { Table } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';
import type {
    EventoPlanificacion,
    ObservacionPlanificacion,
    PlanificacionFilaBase,
    PlanificacionIngrediente,
    ProduccionChange,
    ProduccionPlanificacion,
} from '@/modules/planificacion/types';
import { RolContext } from '@/components/filtroPlatos';
import { PlanificacionTableBody } from '@/modules/planificacion/tabla/PlanificacionTableBody';
import { PlanificacionTableHeader } from '@/modules/planificacion/tabla/PlanificacionTableHeader';
import {
    type FilaPlanificacionModel,
} from '@/modules/planificacion/tabla/planificacionTable.shared';
import { usePlanificacionTableAdelantos } from '@/modules/planificacion/tabla/usePlanificacionTableAdelantos';
import { usePlanificacionTableEditing } from '@/modules/planificacion/tabla/usePlanificacionTableEditing';
import { usePlanificacionTableFilters } from '@/modules/planificacion/tabla/usePlanificacionTableFilters';
import { usePlanificacionTableModel } from '@/modules/planificacion/tabla/usePlanificacionTableModel';
import { PlanificacionAdelantoModal } from './PlanificacionAdelantoModal';
import { PlanificacionObservacionModal } from './PlanificacionObservacionModal';

export function PlanificacionTable({
    platosUnicos,
    diasSemana,
    datos,
    diaActivo,
    produccion,
    produccionUpdate,
    observaciones,
    eventos,
    maxCantidadEventosDia,
    setObservaciones,
    setProduccionUpdate,
    onPlanificacionChanged,
}: {
    platosUnicos: PlanificacionFilaBase[];
    diasSemana: Date[];
    datos: PlanificacionIngrediente[];
    diaActivo: string;
    produccion: ProduccionPlanificacion[];
    produccionUpdate: ProduccionChange[];
    observaciones: ObservacionPlanificacion[];
    eventos: EventoPlanificacion[];
    maxCantidadEventosDia: number;
    setObservaciones: (value: ObservacionPlanificacion[]) => void;
    setProduccionUpdate: React.Dispatch<
        React.SetStateAction<ProduccionChange[]>
    >;
    onPlanificacionChanged: () => void;
}) {
    const rol = useContext(RolContext);
    const canEdit = rol !== 'consultor';

    const [showObservacionModal, setShowObservacionModal] = useState(false);
    const [platoModal, setPlatoModal] = useState('');
    const [platoCodigoModal, setPlatoCodigoModal] = useState('');
    const [platoPadreModal, setPlatoPadreModal] = useState('');
    const [platoPadreCodigoModal, setPlatoPadreCodigoModal] = useState('');
    const [observacionModal, setObservacionModal] = useState('');
    const [tooltipCompartido, setTooltipCompartido] = useState<{
        left: number;
        text: string;
        top: number;
        visible: boolean;
    }>({
        left: 0,
        text: '',
        top: 0,
        visible: false,
    });
    const [isFullscreenTablas, setIsFullscreenTablas] = useState(false);
    const contenedorTablasRef = useRef<HTMLDivElement | null>(null);
    const handleCloseObservacion = useCallback(() => {
        setObservacionModal('');
        setShowObservacionModal(false);
    }, []);

    const {
        filtroElaboracion,
        filtroPlato,
        handleLimpiarFiltros,
        limpiandoFiltros,
        opcionesElaboracion,
        opcionesPlato,
        platosFiltrados,
        setFiltroElaboracion,
        setFiltroPlato,
    } = usePlanificacionTableFilters({
        platosUnicos,
    });

    const {
        abrirAdelantoEvento,
        accionMasivaAdelanto,
        adelantarEvento,
        adelantandoTodo,
        cargandoPlatosAdelantados,
        cerrandoModalAdelanto,
        handleCloseAdelantar,
        handleToggleAdelantoTodo,
        handleTogglePlatoAdelantado,
        platosAdelantados,
        platosGuardandoAdelanto,
        todosAdelantados,
    } = usePlanificacionTableAdelantos({
        canEdit,
        onPlanificacionChanged,
    });

    const {
        celdaEditando,
        cerrarEdicionCelda,
        guardarEdicionCelda,
        handleDragOverInputCantidad,
        handleDropInputCantidad,
        iniciarDragCantidad,
        iniciarEdicionCelda,
        setValorCeldaEditando,
        valorCeldaEditando,
    } = usePlanificacionTableEditing({
        canEdit,
        setProduccionUpdate,
    });

    const {
        cantidadFilasCabeceraSuperior,
        diasVisibles,
        eventosPorFecha,
        filasPlanificacion,
        indiceFilaTitulos,
        layout,
    } = usePlanificacionTableModel({
        canEdit,
        datos,
        diaActivo,
        diasSemana,
        eventos,
        maxCantidadEventosDia,
        observaciones,
        platosFiltrados,
        produccion,
        produccionUpdate,
    });

    const ocultarTooltipCompartido = useCallback(() => {
        setTooltipCompartido((prev) =>
            prev.visible ? { ...prev, visible: false } : prev,
        );
    }, []);

    const mostrarTooltipCompartido = useCallback(
        (
            event:
                | React.MouseEvent<HTMLElement>
                | React.FocusEvent<HTMLElement>,
            text: string,
        ) => {
            if (!text.trim()) {
                ocultarTooltipCompartido();
                return;
            }

            const rect = event.currentTarget.getBoundingClientRect();

            setTooltipCompartido({
                left: rect.left + rect.width / 2,
                text,
                top: rect.bottom + 8,
                visible: true,
            });
        },
        [ocultarTooltipCompartido],
    );

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreenTablas(
                document.fullscreenElement === contenedorTablasRef.current,
            );
            ocultarTooltipCompartido();
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        handleFullscreenChange();

        return () => {
            document.removeEventListener(
                'fullscreenchange',
                handleFullscreenChange,
            );
        };
    }, [ocultarTooltipCompartido]);

    useEffect(() => {
        const contenedor = contenedorTablasRef.current;

        if (!contenedor) {
            return;
        }

        contenedor.addEventListener('scroll', ocultarTooltipCompartido, {
            passive: true,
        });

        return () => {
            contenedor.removeEventListener('scroll', ocultarTooltipCompartido);
        };
    }, [ocultarTooltipCompartido]);

    const handleToggleFullscreenTablas = useCallback(async () => {
        const contenedor = contenedorTablasRef.current;

        if (!contenedor) return;

        try {
            if (document.fullscreenElement === contenedor) {
                await document.exitFullscreen();
                return;
            }

            await contenedor.requestFullscreen();
        } catch (error) {
            console.error('No se pudo cambiar a pantalla completa:', error);
        }
    }, []);

    const handleGuardarObservacion = useCallback(() => {
        const yaExiste = observaciones.some(
            (item) =>
                item.platoCodigo === platoCodigoModal &&
                item.platoPadreCodigo === platoPadreCodigoModal,
        );

        const siguienteObservaciones = yaExiste
            ? observaciones.map((item) =>
                  item.platoCodigo === platoCodigoModal &&
                  item.platoPadreCodigo === platoPadreCodigoModal
                      ? {
                            ...item,
                            observacion: observacionModal,
                        }
                      : item,
              )
            : [
                  ...observaciones,
                  {
                      observacion: observacionModal,
                      plato: platoModal,
                      platoCodigo: platoCodigoModal,
                      platoPadre: platoPadreModal,
                      platoPadreCodigo: platoPadreCodigoModal,
                  },
              ];

        setObservaciones(siguienteObservaciones);
        handleCloseObservacion();
    }, [
        handleCloseObservacion,
        observacionModal,
        observaciones,
        platoCodigoModal,
        platoModal,
        platoPadreCodigoModal,
        platoPadreModal,
        setObservaciones,
    ]);

    const handleOpenObservacion = useCallback((fila: FilaPlanificacionModel) => {
        setObservacionModal(fila.observacionActual);
        setPlatoModal(fila.plato);
        setPlatoCodigoModal(fila.platoCodigo);
        setPlatoPadreModal(fila.platoPadre);
        setPlatoPadreCodigoModal(fila.platoPadreCodigo);
        setShowObservacionModal(true);
    }, []);

    return (
        <>
            <PlanificacionObservacionModal
                container={contenedorTablasRef.current ?? undefined}
                show={showObservacionModal}
                plato={platoModal}
                platoPadre={platoPadreModal}
                observacion={observacionModal}
                canEdit={canEdit}
                onChangeObservacion={setObservacionModal}
                onClose={handleCloseObservacion}
                onSave={handleGuardarObservacion}
            />

            <PlanificacionAdelantoModal
                container={contenedorTablasRef.current ?? undefined}
                show={adelantarEvento != 0}
                cargandoPlatos={cargandoPlatosAdelantados}
                platos={platosAdelantados}
                adelantandoTodo={adelantandoTodo}
                accionMasivaAdelanto={accionMasivaAdelanto}
                todosAdelantados={todosAdelantados}
                platosGuardandoIds={platosGuardandoAdelanto}
                cerrandoModal={cerrandoModalAdelanto}
                onToggleAdelantoTodo={() => {
                    void handleToggleAdelantoTodo();
                }}
                onTogglePlato={handleTogglePlatoAdelantado}
                onClose={() => {
                    void handleCloseAdelantar();
                }}
            />

            <div
                ref={contenedorTablasRef}
                className="no-scrollbar"
                style={{
                    maxHeight: isFullscreenTablas ? '100vh' : '90vh',
                    height: isFullscreenTablas ? '100vh' : undefined,
                    overflow: 'auto',
                    backgroundColor: '#fff',
                }}>
                <ToastContainer />
                <Table
                    style={{
                        width: 'max-content',
                        minWidth: '100%',
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                    }}
                    className="planificacion-tabla-unificada mb-0"
                    size="sm"
                    striped>
                    <PlanificacionTableHeader
                        canEdit={canEdit}
                        cantidadFilasCabeceraSuperior={
                            cantidadFilasCabeceraSuperior
                        }
                        diasVisibles={diasVisibles}
                        eventosPorFecha={eventosPorFecha}
                        filtroElaboracion={filtroElaboracion}
                        filtroPlato={filtroPlato}
                        indiceFilaTitulos={indiceFilaTitulos}
                        isFullscreen={isFullscreenTablas}
                        limpiandoFiltros={limpiandoFiltros}
                        onAbrirAdelantoEvento={abrirAdelantoEvento}
                        onFiltroElaboracionChange={setFiltroElaboracion}
                        onFiltroPlatoChange={setFiltroPlato}
                        onLimpiarFiltros={handleLimpiarFiltros}
                        onToggleFullscreen={handleToggleFullscreenTablas}
                        obtenerStyleHeaderDia={layout.obtenerStyleHeaderDia}
                        obtenerStyleHeaderStickyIzquierda={
                            layout.obtenerStyleHeaderStickyIzquierda
                        }
                        opcionesElaboracion={opcionesElaboracion}
                        opcionesPlato={opcionesPlato}
                    />
                    <PlanificacionTableBody
                        canEdit={canEdit}
                        celdaEditando={celdaEditando}
                        cerrarEdicionCelda={cerrarEdicionCelda}
                        filas={filasPlanificacion}
                        guardarEdicionCelda={guardarEdicionCelda}
                        handleDragOverInputCantidad={
                            handleDragOverInputCantidad
                        }
                        handleDropInputCantidad={handleDropInputCantidad}
                        iniciarDragCantidad={iniciarDragCantidad}
                        iniciarEdicionCelda={iniciarEdicionCelda}
                        mostrarTooltipCompartido={mostrarTooltipCompartido}
                        obtenerStyleStickyIzquierda={
                            layout.obtenerStyleStickyIzquierda
                        }
                        obtenerStyleTextoSticky={
                            layout.obtenerStyleTextoSticky
                        }
                        ocultarTooltipCompartido={ocultarTooltipCompartido}
                        onOpenObservation={handleOpenObservacion}
                        setValorCeldaEditando={setValorCeldaEditando}
                        styleCeldaDia={layout.styleCeldaDia}
                        valorCeldaEditando={valorCeldaEditando}
                    />
                </Table>
            </div>
            <div
                aria-hidden={!tooltipCompartido.visible}
                className={`planificacion-tooltip-compartido${
                    tooltipCompartido.visible
                        ? ' planificacion-tooltip-compartido-visible'
                        : ''
                }`}
                role="tooltip"
                style={{
                    left: `${tooltipCompartido.left}px`,
                    top: `${tooltipCompartido.top}px`,
                }}>
                {tooltipCompartido.text}
            </div>
        </>
    );
}
