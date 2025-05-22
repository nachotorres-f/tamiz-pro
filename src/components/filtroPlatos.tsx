import { Form } from 'react-bootstrap';

export function FiltroPlatos({
    filtro,
    setFiltro,
}: {
    filtro: string;
    setFiltro: (value: string) => void;
}) {
    return (
        <Form.Control
            type="text"
            placeholder="Buscar plato..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="col-md-4 mb-3"
        />
    );
}
