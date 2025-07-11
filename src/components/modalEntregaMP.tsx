import { useState, useMemo } from 'react';
import { Modal, Table, Button, Alert, Form } from 'react-bootstrap';
import { startOfWeek, addDays, format, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ModalProduccionProps {
    show: boolean;
    onHide: () => void;
    ingrediente: string;
    datos: { plato: string; fecha: string; cantidad: number }[];
}

export default function ModalEntregaMP({
    show,
    onHide,
    ingrediente,
    datos,
}: ModalProduccionProps) {
    const lunes = startOfWeek(new Date(), { weekStartsOn: 1 });
    const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(lunes, i));

    // Filtrar los datos para el ingrediente y esta semana
    const datosFiltrados = useMemo(() => {
        return datos.filter(
            (item) =>
                item.plato === ingrediente &&
                diasSemana.some((d) => isSameDay(parseISO(item.fecha), d))
        );
    }, [ingrediente, datos, diasSemana]);

    // Total necesario por día
    const necesarioPorDia = diasSemana.map((dia) => {
        const total = datosFiltrados
            .filter((d) => isSameDay(parseISO(d.fecha), dia))
            .reduce((acc, curr) => acc + curr.cantidad, 0);
        return parseFloat(total.toFixed(2));
    });

    const [produccion, setProduccion] = useState(Array(7).fill(0));

    const totalNecesario = necesarioPorDia.reduce((a, b) => a + b, 0);
    const totalProduccion = produccion.reduce((a, b) => a + b, 0);
    const diferencia = parseFloat(
        (totalProduccion - totalNecesario).toFixed(2)
    );

    const alerta =
        diferencia === 0
            ? { variant: 'success', texto: 'Producción exacta' }
            : diferencia > 0
            ? {
                  variant: 'warning',
                  texto: `Produciendo de más: +${diferencia}`,
              }
            : {
                  variant: 'danger',
                  texto: `Produciendo de menos: ${diferencia}`,
              };

    const handleChange = (val: string, i: number) => {
        const nueva = [...produccion];
        nueva[i] = parseFloat(val) || 0;
        setProduccion(nueva);
    };

    const saveProduccion = () => {
        fetch('/api/entregaMP', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ingrediente,
                produccion: diasSemana.map((dia, i) => ({
                    fecha: format(dia, 'yyyy-MM-dd'),
                    cantidad: produccion[i],
                })),
            }),
        })
            .then((res) => {
                if (!res.ok) throw new Error('Error al guardar');
                onHide();
            })
            .catch(() => {
                alert('No se pudo guardar la producción');
            });
    };

    return (
        <Modal
            show={show}
            onHide={onHide}
            size="lg">
            <Modal.Header closeButton>
                <Modal.Title>{ingrediente}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Alert variant={alerta.variant}>{alerta.texto}</Alert>

                <Table
                    bordered
                    className="text-center">
                    <thead className="table-light">
                        <tr style={{ textAlign: 'center' }}>
                            <th>Total necesario</th>
                            {diasSemana.map((d, i) => (
                                <th key={i}>
                                    {format(d, 'EEEE dd', { locale: es })}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr style={{ textAlign: 'center' }}>
                            <td>
                                <strong>{totalNecesario}</strong>
                            </td>
                            {necesarioPorDia.map((cant, i) => (
                                <td key={i}>{cant.toFixed(2)}</td>
                            ))}
                        </tr>
                        <tr style={{ textAlign: 'center' }}>
                            <td>
                                <strong>Total</strong>:{' '}
                                {totalProduccion.toFixed(2)}
                            </td>
                            {produccion.map((val, i) => (
                                <td key={i}>
                                    <Form.Control
                                        size="sm"
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        value={val}
                                        onChange={(e) =>
                                            handleChange(e.target.value, i)
                                        }
                                    />
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </Table>
            </Modal.Body>
            <Modal.Footer>
                <Button
                    variant="secondary"
                    onClick={onHide}>
                    Cerrar
                </Button>
                <Button
                    variant="primary"
                    onClick={saveProduccion}>
                    Guardar
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
