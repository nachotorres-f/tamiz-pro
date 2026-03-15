import type { PropsWithChildren, UIEvent } from 'react';

interface RightPlanificacionTableProps {
    onScroll: (event: UIEvent<HTMLDivElement>) => void;
}

export function RightPlanificacionTable({
    onScroll,
    children,
}: PropsWithChildren<RightPlanificacionTableProps>) {
    return (
        <div
            id="right-table"
            className="no-scrollbar"
            style={{
                overflow: 'auto',
                flexGrow: 1,
            }}
            onScroll={onScroll}>
            {children}
        </div>
    );
}
