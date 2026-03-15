import type { PropsWithChildren, UIEvent } from 'react';

interface LeftPlanificacionTableProps {
    onScroll: (event: UIEvent<HTMLDivElement>) => void;
}

export function LeftPlanificacionTable({
    onScroll,
    children,
}: PropsWithChildren<LeftPlanificacionTableProps>) {
    return (
        <div
            id="left-table"
            className="no-scrollbar"
            style={{
                flexShrink: 0,
                overflow: 'auto',
                position: 'sticky',
                left: 0,
                zIndex: 3,
            }}
            onScroll={onScroll}>
            {children}
        </div>
    );
}
