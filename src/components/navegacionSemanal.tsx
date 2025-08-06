'use cliente';
import React from 'react';
import { Button } from 'react-bootstrap';
import { addDays } from 'date-fns';

export function NavegacionSemanal({
    semanaBase,
    setSemanaBase,
}: {
    semanaBase: Date;
    setSemanaBase: (value: Date) => void;
}) {
    const [contador, setContador] = React.useState(0);
    return (
        <div className="d-flex justify-content-end mb-3">
            {
                // contador > 0 && (
                true && (
                    <Button
                        size="sm"
                        className="me-2"
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
                onClick={() => {
                    setSemanaBase(addDays(semanaBase, 7));
                    setContador(contador + 1);
                }}>
                Semana siguiente ➡
            </Button>
        </div>
    );
}
