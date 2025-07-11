import React, { useEffect } from 'react';
import { Button, Col, Container, Form, Row } from 'react-bootstrap';

export default function AgregarPlato() {
    type Plato = { codigo: string | number; nombreProducto: string };
    const [platos, setPlatos] = React.useState<Plato[]>([]);
    type Comanda = { id: string | number; nombre: string; tipo: string };
    const [comandas, setComandas] = React.useState<Comanda[]>([]);

    useEffect(() => {
        fetch('/api/platos')
            .then((res) => res.json())
            .then((data) => {
                setPlatos(data.platos);
                setComandas(data.comandas);
            });
    }, []);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const plato = (document.getElementById('plato') as HTMLSelectElement)
            ?.value;
        const comanda = (
            document.getElementById('comanda') as HTMLSelectElement
        )?.value;
        const cantidad = (
            document.getElementById('cantidad') as HTMLInputElement
        )?.value;

        if (!plato || !comanda || !cantidad) {
            alert('Por favor, completa todos los campos.');
            return;
        }

        fetch('/api/platos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                idComanda: comanda,
                plato: plato,
                cantidad: parseInt(cantidad, 10),
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                console.log('Plato agregado:', data);
                // Aquí puedes actualizar el estado o hacer algo más
            })
            .catch((error) => {
                console.error('Error al agregar el plato:', error);
            });

        window.location.reload();
    };

    return (
        <Container className="">
            <Form onSubmit={handleSubmit}>
                <Row>
                    <Col>
                        <Form.Group controlId="plato">
                            <Form.Label>Plato</Form.Label>
                            <Form.Select>
                                <option
                                    value=""
                                    disabled>
                                    Selecciona un plato
                                </option>
                                {platos.map((plato) => (
                                    <option
                                        key={plato.codigo}
                                        value={plato.nombreProducto}>
                                        {plato.codigo +
                                            ' - ' +
                                            plato.nombreProducto}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col>
                        <Form.Group controlId="comanda">
                            <Form.Label>Comanda</Form.Label>
                            <Form.Select>
                                <option
                                    value=""
                                    disabled>
                                    Selecciona una comanda
                                </option>

                                {comandas.map((comanda) => (
                                    <option
                                        key={comanda.id}
                                        value={comanda.id}>
                                        {comanda.nombre + ' - ' + comanda.tipo}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col>
                        <Form.Group controlId="cantidad">
                            <Form.Label>Cantidad</Form.Label>
                            <Form.Control
                                type="number"
                                step="any"
                                placeholder="Ingresa la cantidad"
                            />
                        </Form.Group>
                    </Col>
                    <Col>
                        <Button
                            variant="success"
                            style={{ margin: '2rem auto', display: 'block' }}
                            type="submit">
                            Agregar Plato
                        </Button>
                    </Col>
                </Row>
            </Form>
        </Container>
    );
}
