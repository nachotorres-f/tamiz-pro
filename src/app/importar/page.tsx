'use client';

import { useState } from 'react';
import { Container, Form, Button, Alert, Card } from 'react-bootstrap';

export default function ImportarPage() {
    const [recetaFile, setRecetaFile] = useState<File | null>(null);
    const [eventoFile, setEventoFile] = useState<File | null>(null);
    const [msg, setMsg] = useState<string>('');

    const handleUpload = async (type: 'recetas' | 'evento') => {
        const file = type === 'recetas' ? recetaFile : eventoFile;
        if (!file) {
            setMsg('Por favor seleccioná un archivo para importar');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`/api/importar/${type}`, {
            method: 'POST',
            body: formData,
        });

        const data = await res.json();
        if (res.ok) {
            setMsg(`Archivo de ${type} importado correctamente`);
        } else {
            setMsg(data.message || 'Error al importar el archivo');
        }
    };

    return (
        <Container
            className="mt-5"
            style={{ maxWidth: '600px' }}>
            <h2 className="text-center mb-4">Importar archivos</h2>
            {msg && <Alert variant="info">{msg}</Alert>}

            <Card className="mb-4 shadow-sm">
                <Card.Body>
                    <Card.Title className="mb-3">Maestro de Recetas</Card.Title>
                    <Form.Group controlId="formReceta">
                        <Form.Control
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) =>
                                setRecetaFile(
                                    (e.target as HTMLInputElement).files?.[0] ||
                                        null
                                )
                            }
                        />
                    </Form.Group>
                    <Button
                        className="mt-3 w-100"
                        variant="primary"
                        onClick={() => handleUpload('recetas')}>
                        Subir Recetas
                    </Button>
                </Card.Body>
            </Card>

            <Card className="mb-4 shadow-sm">
                <Card.Body>
                    <Card.Title className="mb-3">Evento</Card.Title>
                    <Form.Group controlId="formEvento">
                        <Form.Control
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) =>
                                setEventoFile(
                                    (e.target as HTMLInputElement).files?.[0] ||
                                        null
                                )
                            }
                        />
                    </Form.Group>
                    <Button
                        className="mt-3 w-100"
                        variant="primary"
                        onClick={() => handleUpload('evento')}>
                        Subir Evento
                    </Button>
                </Card.Body>
            </Card>
        </Container>
    );
}
