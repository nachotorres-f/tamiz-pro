'use cliente';
import { Button } from 'react-bootstrap';
import { addDays } from 'date-fns';

export function NavegacionSemanal({
    semanaBase,
    setSemanaBase,
}: {
    semanaBase: Date;
    setSemanaBase: (value: Date) => void;
}) {
    return (
        <div className="d-flex justify-content-between mb-3">
            <Button
                size="sm"
                onClick={() => setSemanaBase(addDays(semanaBase, -7))}>
                ⬅ Semana anterior
            </Button>

            <Button
                size="sm"
                onClick={() => setSemanaBase(addDays(semanaBase, 7))}>
                Semana siguiente ➡
            </Button>
        </div>
    );
}
