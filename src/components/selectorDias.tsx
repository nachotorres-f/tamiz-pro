'use client';
import { Form } from 'react-bootstrap';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

export function SelectorDias({
    diasSemana,
    setDiaActivo,
}: {
    diasSemana: Date[];
    setDiaActivo: (value: string) => void;
}) {
    return (
        <Form.Select onChange={(e) => setDiaActivo(e.target.value)}>
            <option value="">Todos los días</option>
            {diasSemana.map((d, i) => (
                <option
                    key={i}
                    value={format(d, 'yyyy-MM-dd')}>
                    {format(d, 'EEEE dd/MM', { locale: es })}
                </option>
            ))}
        </Form.Select>
    );
}
