import React, { useEffect, useState } from 'react';
import { Button, Col, Container, Form, Row } from 'react-bootstrap';

type Plato = { codigo: string | number; nombreProducto: string };
type Comanda = { id: string | number; nombre: string; tipo: string };

export default function AgregarPlato() {
    const [platos, setPlatos] = useState<Plato[]>([]);
    const [comandas, setComandas] = useState<Comanda[]>([]);
    const [selectedPlato, setSelectedPlato] = useState<string>('');
    const [selectedComanda, setSelectedComanda] = useState<string>('');
    const [cantidad, setCantidad] = useState<string>('');

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

        if (!selectedPlato || !selectedComanda || !cantidad) {
            alert('Por favor, completa todos los campos.');
            return;
        }

        fetch('/api/platos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                idComanda: selectedComanda,
                plato: selectedPlato,
                cantidad: parseInt(cantidad, 10),
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                console.log('Plato agregado:', data);
                window.location.reload();
            })
            .catch((error) => {
                console.error('Error al agregar el plato:', error);
            });
    };

    return (
        <Container>
            <Form onSubmit={handleSubmit}>
                <Row>
                    <Col>
                        <Form.Group controlId="plato">
                            <Form.Label>Plato</Form.Label>
                            <Form.Select
                                value={selectedPlato}
                                onChange={(e) =>
                                    setSelectedPlato(e.target.value)
                                }>
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
                            <Form.Select
                                value={selectedComanda}
                                onChange={(e) =>
                                    setSelectedComanda(e.target.value)
                                }>
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
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
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
