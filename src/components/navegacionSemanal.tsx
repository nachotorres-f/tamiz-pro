'use cliente';
import React from 'react';
import { Button } from 'react-bootstrap';
import { addDays } from 'date-fns';

export function NavegacionSemanal({
    className = '',
    justifyContent = 'end',
    semanaBase,
    setSemanaBase,
}: {
    className?: string;
    justifyContent?: 'start' | 'end';
    semanaBase: Date;
    setSemanaBase: (value: Date) => void;
}) {
    const [contador, setContador] = React.useState(0);

    return (
        <div
            className={`d-flex flex-wrap gap-2 ${
                justifyContent === 'start'
                    ? 'justify-content-start'
                    : 'justify-content-end'
            } ${className}`.trim()}>
            {
                // contador > 0 && (
                true && (
                    <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => {
                            setSemanaBase(addDays(semanaBase, -7));
                            setContador(contador - 1);
                        }}>
                        ⬅ Semana anterior
                    </Button>
                )
            }

            <Button
                size="sm"
                variant="outline-primary"
                onClick={() => {
                    setSemanaBase(addDays(semanaBase, 7));
                    setContador(contador + 1);
                }}>
                Semana siguiente ➡
            </Button>
        </div>
    );
}
