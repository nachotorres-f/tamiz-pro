interface PlanificacionHeaderProps {
    textoSemana: string;
}

export function PlanificacionHeader({ textoSemana }: PlanificacionHeaderProps) {
    return (
        <>
            <h1 className="text-center display-5 fw-bold mb-2">Planificación</h1>
            <p className="text-center text-secondary fs-4 fw-semibold mb-4">
                {textoSemana}
            </p>
        </>
    );
}
