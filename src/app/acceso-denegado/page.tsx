'use client';

import { useRouter } from 'next/navigation';
import { Button, Card, Container } from 'react-bootstrap';

export default function AccesoDenegadoPage() {
    const router = useRouter();

    const handleLogout = async () => {
        await fetch('/api/logout', { method: 'POST' });
        router.push('/acceso');
    };

    return (
        <Container className="py-5 d-flex justify-content-center">
            <Card
                className="shadow-sm border-0"
                style={{ maxWidth: 560, width: '100%' }}>
                <Card.Body className="p-4 p-md-5 text-center">
                    <h2 className="mb-3">Acceso denegado</h2>
                    <p className="text-muted mb-4">
                        Tu usuario no tiene páginas habilitadas para ingresar al
                        sistema.
                    </p>
                    <Button onClick={handleLogout}>Cerrar sesión</Button>
                </Card.Body>
            </Card>
        </Container>
    );
}
