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
    const fechaHoy = new Date();

    return (
        <div className="d-flex justify-content-between mb-3">
            <Button onClick={() => setSemanaBase(addDays(semanaBase, -7))}>
                ⬅ Semana anterior
            </Button>

            <Button onClick={() => setSemanaBase(fechaHoy)}>
                Semana actual
            </Button>

            <Button onClick={() => setSemanaBase(addDays(semanaBase, 7))}>
                Semana siguiente ➡
            </Button>
        </div>
    );
}
