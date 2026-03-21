'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import { Container } from 'react-bootstrap';
import { Slide, toast } from 'react-toastify';
import { Loading } from '@/components/loading';
import { RolContext, SalonContext } from '@/components/filtroPlatos';
import { usePlanificacionPageState } from '@/modules/planificacion/hooks/usePlanificacionPage';
import { actualizarEstadoComandaPlanificacion } from '@/modules/planificacion/services/planificacion.client';
import type { SalonPlanificacion } from '@/modules/planificacion/types';
import { PlanificacionAutoSaveStatus } from './PlanificacionAutoSaveStatus';
import { PlanificacionComandasPanel } from './PlanificacionComandasPanel';
import { PlanificacionTable } from './PlanificacionTable';

export function PlanificacionPageClient() {
    const salonSeleccionado = useContext(SalonContext);
    const rol = useContext(RolContext);
    const toastActualizandoPlanificacionRef = useRef<string | number | null>(
        null,
    );
    const [actualizandoComandaId, setActualizandoComandaId] = useState<
        number | null
    >(null);

    const salonActual: SalonPlanificacion =
        salonSeleccionado === 'B' ? 'B' : 'A';

    const {
        actualizandoPlanificacion,
        comandasCiclo,
        datosPlanificacion,
        diaActivo,
        diasSemana,
        estadoAutoGuardado,
        eventos,
        loading,
        maxCantidadEventosDia,
        observaciones,
        platosUnicos,
        produccion,
        produccionUpdate,
        refreshComandas,
        refreshPlanificacion,
        setObservaciones,
        setProduccionUpdate,
        textoSemana,
        ultimaSincronizacion,
    } = usePlanificacionPageState({
        salonActual,
    });

    useEffect(() => {
        if (actualizandoPlanificacion) {
            if (
                toastActualizandoPlanificacionRef.current === null ||
                !toast.isActive(toastActualizandoPlanificacionRef.current)
            ) {
                toastActualizandoPlanificacionRef.current = toast.info(
                    'Actualizando planificación...',
                    {
                        position: 'bottom-right',
                        theme: 'colored',
                        transition: Slide,
                        autoClose: false,
                        closeOnClick: false,
                        draggable: false,
                    },
                );
            }
            return;
        }

        if (toastActualizandoPlanificacionRef.current !== null) {
            toast.dismiss(toastActualizandoPlanificacionRef.current);
            toastActualizandoPlanificacionRef.current = null;
        }
    }, [actualizandoPlanificacion]);

    useEffect(
        () => () => {
            if (toastActualizandoPlanificacionRef.current !== null) {
                toast.dismiss(toastActualizandoPlanificacionRef.current);
            }
        },
        [],
    );

    const handleToggleComanda = async (
        comandaId: number,
        habilitada: boolean,
    ) => {
        const esComandaDelCiclo = comandasCiclo.some(
            (comanda) => comanda.id === comandaId,
        );

        if (!esComandaDelCiclo) {
            toast.warn('Sólo se pueden editar comandas del ciclo actual.', {
                position: 'bottom-right',
                theme: 'colored',
                transition: Slide,
            });
            return;
        }

        setActualizandoComandaId(comandaId);

        try {
            await actualizarEstadoComandaPlanificacion({
                id: comandaId,
                deshabilitada: !habilitada,
            });
            refreshComandas();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Error al actualizar la comanda',
                {
                    position: 'bottom-right',
                    theme: 'colored',
                    transition: Slide,
                },
            );
        } finally {
            setActualizandoComandaId(null);
        }
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <div>
            <Container className="mt-5 flex-grow-1">
                <h1 className="text-center display-5 fw-bold mb-2">
                    Planificación
                </h1>
                <p className="text-center text-secondary fs-4 fw-semibold mb-4">
                    {textoSemana}
                </p>
                <Container className="mb-3">
                    <PlanificacionComandasPanel
                        actualizandoComandaId={actualizandoComandaId}
                        comandasCiclo={comandasCiclo}
                        onToggleComanda={handleToggleComanda}
                        rol={rol}
                    />
                </Container>

                {rol !== 'consultor' && (
                    <Container>
                        <PlanificacionAutoSaveStatus
                            estado={estadoAutoGuardado}
                            ultimaSincronizacion={ultimaSincronizacion}
                        />
                    </Container>
                )}
            </Container>

            <div
                id="container-planificacion"
                className="mb-3"
                style={{ overflow: 'auto', height: '90vh' }}>
                <PlanificacionTable
                    platosUnicos={platosUnicos}
                    diasSemana={diasSemana}
                    datos={datosPlanificacion}
                    diaActivo={diaActivo}
                    produccion={produccion}
                    produccionUpdate={produccionUpdate}
                    setProduccionUpdate={setProduccionUpdate}
                    observaciones={observaciones}
                    setObservaciones={setObservaciones}
                    maxCantidadEventosDia={maxCantidadEventosDia}
                    eventos={eventos}
                    onPlanificacionChanged={refreshPlanificacion}
                />
            </div>
        </div>
    );
}
